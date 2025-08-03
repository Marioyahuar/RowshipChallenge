# Guía Técnica de Implementación: Automated Liquidity Manager (ALM) - Testnet

## 1. Resumen del Proyecto

### Objetivo Principal
Desarrollar un sistema de gestión automatizada de liquidez (ALM) que mantenga posiciones concentradas en el tick activo exacto de un pool de stablecoins, maximizando la captura de fees y emisiones mediante rebalanceo automático.

### Componentes del Sistema
- **Smart Contracts**: RamsesV3Pool + ALM Manager + Tokens Mock
- **Ejecutor/Monitor**: Servicio TypeScript que detecta cambios de tick y ejecuta rebalanceos
- **Frontend**: UI React que muestra métricas en tiempo real
- **Testnet**: Entorno simulado completo con tokens mock

---

## 2. Arquitectura del Sistema

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend UI   │◄──►│  Executor Bot    │◄──►│ Smart Contracts │
│    (React)      │    │   (TypeScript)   │    │   (Solidity)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────▼──────────────┐
                    │       Testnet RPC          │
                    │  (Sonic/Sepolia/Hardhat)   │
                    └────────────────────────────┘
```

### 2.1 Smart Contracts
1. **FakeUSDC.sol** - Token ERC20 simulado
2. **FakeSCUSD.sol** - Token ERC20 simulado  
3. **RamsesV3Pool** - Pool DEX real (usar contratos existentes en carpeta RamesV3Pool/)
4. **ALMManager.sol** - Contrato principal del ALM
5. **RamsesV3Factory** - Factory del protocolo Ramses (si está disponible)

### 2.2 Servicio Ejecutor
- **Monitoreo continuo** del tick actual del pool
- **Detección de cambios** que requieren rebalanceo
- **Ejecución automática** de transacciones de rebalanceo
- **Logging y métricas** de performance

### 2.3 Frontend
- **Dashboard en tiempo real** con métricas del ALM
- **Visualización de posición actual** y historial
- **Controles manuales** para testing
- **Estado de conexión** con contratos

---

## 3. Stack Tecnológico

### 3.1 Smart Contracts
- **Lenguaje**: Solidity ^0.8.19
- **Framework**: Hardhat
- **Librerías**: OpenZeppelin Contracts
- **Testing**: Hardhat + Waffle/Chai
- **Pool**: RamsesV3Pool (contratos existentes)

### 3.2 Ejecutor
- **Runtime**: Node.js 18+
- **Lenguaje**: TypeScript
- **Blockchain Interaction**: Ethers.js v6
- **Scheduler**: node-cron o setInterval
- **Logging**: Winston

### 3.3 Frontend (Stack Simplificado)
- **Framework**: React 18+ con TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Blockchain**: Ethers.js v6
- **Estado**: React Context API
- **HTTP Client**: Fetch API nativo

### 3.4 Deployment
- **Contracts**: Hardhat deploy scripts
- **Frontend**: Vercel
- **Executor**: VPS o cloud service (mantenido corriendo)

---

## 4. Tokens Mock

### 4.1 FakeUSDC
```solidity
contract FakeUSDC is ERC20 {
    constructor() ERC20("Fake USD Coin", "fUSDC") {
        _mint(msg.sender, 1000000 * 10**6); // 1M tokens, 6 decimales
    }
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount); // Para testing
    }
}
```

### 4.2 FakeSCUSD
```solidity
contract FakeSCUSD is ERC20 {
    constructor() ERC20("Fake Shadow USD", "fscUSD") {
        _mint(msg.sender, 1000000 * 10**18); // 1M tokens, 18 decimales
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount); // Para testing
    }
}
```

---

## 5. RamsesV3Pool Implementation

### 5.1 Uso de Contratos Existentes
**IMPORTANTE**: Usar los contratos RamsesV3Pool que ya tienes en la carpeta `RamsesV3Pool/`. Estos contratos son la implementación real del protocolo y proporcionan:

- Gestión de liquidez concentrada por ticks
- Swaps con lógica de precio real
- Sistema de fees robusto
- Eventos completos para monitoreo

### 5.2 Funciones Clave del RamsesV3Pool
Las funciones principales que el ALM necesitará usar:
- `mint()` - Agregar liquidez concentrada
- `burn()` - Remover liquidez
- `collect()` - Recoger fees acumulados
- `swap()` - Ejecutar swaps (para testing)
- `slot0()` - Obtener tick actual y precio
- `positions()` - Consultar posiciones existentes

### 5.3 Eventos Importantes a Monitorear
```solidity
event Mint(address indexed owner, int24 indexed tickLower, int24 indexed tickUpper, uint128 amount, uint256 amount0, uint256 amount1);
event Burn(address indexed owner, int24 indexed tickLower, int24 indexed tickUpper, uint128 amount, uint256 amount0, uint256 amount1);
event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick);
```

---

## 6. ALM Strategy Implementation

### 6.1 ALMManager.sol
```solidity
contract ALMManager {
    struct ALMState {
        uint128 totalLiquidity;
        int24 currentTickLower;
        int24 currentTickUpper;
        uint256 lastRebalanceTimestamp;
        uint256 totalFeesCollected0;
        uint256 totalFeesCollected1;
    }
    
    ALMState public almState;
    address public pool;
    address public token0;
    address public token1;
    address public owner;
    
    uint256 public constant REBALANCE_THRESHOLD = 1; // 1 tick
    int24 public constant TICK_SPACING = 1; // Para stablecoins
    
    event Rebalanced(int24 oldTickLower, int24 oldTickUpper, int24 newTickLower, int24 newTickUpper);
    event FeesCollected(uint256 amount0, uint256 amount1);
    
    function rebalance() external;
    function emergencyWithdraw() external onlyOwner;
    function getALMMetrics() external view returns (ALMState memory);
    function getCurrentPoolState() external view returns (int24 currentTick, uint160 sqrtPriceX96);
}
```

### 6.2 Estrategia de Rebalanceo
1. **Monitor**: Verificar si `IRamsesV3Pool(pool).slot0().tick` != `almState.currentTickLower`
2. **Remove**: `IRamsesV3Pool(pool).burn()` para remover liquidez actual
3. **Collect**: `IRamsesV3Pool(pool).collect()` para recoger fees acumulados
4. **Add**: `IRamsesV3Pool(pool).mint()` en el nuevo tick activo (tick actual, tick actual + TICK_SPACING)
5. **Update**: Actualizar estado interno y emitir eventos

### 6.3 Métricas a Trackear
- Liquidez total activa
- Fees recolectados por período (token0 y token1)
- Número de rebalanceos exitosos
- Tiempo promedio fuera de rango
- Gas cost vs fees ganados ratio
- APY efectivo del ALM

---

## 7. Sistema de Inputs/Outputs

### 7.1 Inputs del Sistema
```typescript
interface SystemInputs {
  poolAddress: string;
  almManagerAddress: string;
  rebalanceThreshold: number; // En ticks
  monitoringInterval: number; // En segundos
  gasLimit: number;
  slippageTolerance: number;
  minLiquidityThreshold: string; // Mínima liquidez para operar
}
```

### 7.2 Outputs Esperados
```typescript
interface ALMMetrics {
  currentPosition: {
    tickLower: number;
    tickUpper: number;
    liquidity: string;
  };
  performance: {
    totalFeesEarned0: string; // En token0
    totalFeesEarned1: string; // En token1
    totalFeesEarnedUSD: string; // Estimado en USD
    rebalanceCount: number;
    successRate: number;
    avgTimeInRange: number;
    currentAPY: number;
  };
  poolData: {
    currentTick: number;
    sqrtPriceX96: string;
    totalLiquidity: string;
    token0Price: string; // En terms de token1
  };
}
```

---

## 8. Estructura del Repositorio

```
alm-testnet-project/
├── contracts/                 # Smart contracts
│   ├── tokens/
│   │   ├── FakeUSDC.sol
│   │   └── FakeSCUSD.sol
│   ├── RamsesV3Pool/          # Contratos RamsesV3 existentes
│   │   ├── RamsesV3Pool.sol   # (usar contratos que ya tienes)
│   │   ├── RamsesV3Factory.sol
│   │   └── interfaces/
│   ├── alm/
│   │   └── ALMManager.sol
│   └── interfaces/
│       ├── IALM.sol
│       └── IRamsesV3Pool.sol
├── executor/                  # TypeScript bot
│   ├── src/
│   │   ├── services/
│   │   │   ├── PoolMonitor.ts
│   │   │   ├── ALMExecutor.ts
│   │   │   └── MetricsCollector.ts
│   │   ├── utils/
│   │   │   ├── contracts.ts
│   │   │   ├── logger.ts
│   │   │   └── priceUtils.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/                  # React UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── MetricsCard.tsx
│   │   │   ├── PositionViewer.tsx
│   │   │   └── TransactionHistory.tsx
│   │   ├── contexts/
│   │   │   └── ALMContext.tsx
│   │   ├── hooks/
│   │   │   ├── useALMData.ts
│   │   │   ├── usePoolData.ts
│   │   │   └── useWebSocket.ts
│   │   ├── utils/
│   │   │   ├── contracts.ts
│   │   │   ├── formatting.ts
│   │   │   └── constants.ts
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── scripts/                   # Deploy scripts
│   ├── deploy-tokens.ts
│   ├── deploy-ramses-pool.ts
│   ├── deploy-alm.ts
│   ├── setup-testnet.ts
│   └── simulate-activity.ts
├── test/                      # Contract tests
│   ├── ALMManager.test.ts
│   ├── RamsesV3Pool.test.ts
│   └── integration.test.ts
├── hardhat.config.ts
├── package.json
├── .env.example
└── README.md
```

---

## 9. Configuración de Testnet

### 9.1 Red Recomendada
**Primera opción**: Sonic Testnet
- Explorador: https://explorer.sonic.global
- Faucet: https://faucet.sonic.global
- ChainID: 64165

**Alternativa**: Sepolia
- Más estable, mejor documentada
- Faucets públicos disponibles
- ChainID: 11155111

### 9.2 Setup Hardhat
```javascript
// hardhat.config.ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    sonic_testnet: {
      url: "https://rpc.testnet.soniclabs.com",
      chainId: 64165,
      accounts: [process.env.PRIVATE_KEY!]
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC || "https://sepolia.infura.io/v3/YOUR_KEY",
      chainId: 11155111,
      accounts: [process.env.PRIVATE_KEY!]
    },
    hardhat: {
      chainId: 1337
    }
  }
};

export default config;
```

### 9.3 Variables de Entorno (.env)
```bash
PRIVATE_KEY=your_private_key_here
SONIC_RPC_URL=https://rpc.testnet.soniclabs.com
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 9.4 Simulación de Actividad
Para generar cambios de tick y testing, crear un script que haga swaps pequeños:
```typescript
// scripts/simulate-activity.ts
async function simulateTrading() {
  const pool = await ethers.getContractAt("RamsesV3Pool", POOL_ADDRESS);
  
  // Alternar swaps pequeños para cambiar el tick
  for (let i = 0; i < 10; i++) {
    const zeroForOne = i % 2 === 0;
    await pool.swap(
      deployer.address,
      zeroForOne,
      ethers.parseUnits("100", 6), // 100 USDC
      zeroForOne ? MIN_SQRT_RATIO + 1n : MAX_SQRT_RATIO - 1n,
      "0x"
    );
    
    console.log(`Swap ${i + 1} completed, current tick:`, await pool.slot0().tick);
    await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar 5s
  }
}
```

---

## 10. Consideraciones de Seguridad

### 10.1 Smart Contracts
```solidity
contract ALMManager {
    bool public paused = false;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // Reentrancy protection
    bool private locked;
    modifier nonReentrant() {
        require(!locked, "Reentrant call");
        locked = true;
        _;
        locked = false;
    }
    
    // Emergency functions
    function pause() external onlyOwner {
        paused = true;
    }
    
    function unpause() external onlyOwner {
        paused = false;
    }
}
```

### 10.2 Validaciones Críticas
- **Slippage limits** en todas las operaciones de swap/mint/burn
- **Gas limit checks** antes de rebalanceo
- **Minimum liquidity** requirements
- **Tick validation** (que estén dentro de rangos válidos)
- **Balance checks** antes y después de operaciones
- **Circuit breakers** si hay pérdidas excesivas

### 10.3 Frontend Security
- **Input sanitization** en todas las formas
- **Contract address validation** con checksums
- **Transaction confirmation** antes de submit
- **Connection state management** robusto
- **Error handling** comprehensivo

---

## 11. Frontend Context Implementation

### 11.1 ALMContext.tsx
```typescript
interface ALMContextType {
  almData: ALMMetrics | null;
  poolData: PoolData | null;
  isConnected: boolean;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  executeRebalance: () => Promise<void>;
}

export const ALMContext = createContext<ALMContextType | null>(null);

export const ALMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [almData, setAlmData] = useState<ALMMetrics | null>(null);
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [loading, setLoading] = useState(false);
  // ... resto de la implementación
};
```

---

## 12. Flujo de Desarrollo Sugerido

### Fase 1: Fundación (1-2 horas)
1. Setup del proyecto con Hardhat
2. Deploy de tokens mock (FakeUSDC, FakeSCUSD)
3. Deploy de RamsesV3Pool usando los contratos existentes
4. Tests básicos de pool functionality

### Fase 2: ALM Core (2-3 horas)
1. Implementar ALMManager con integración a RamsesV3Pool
2. Lógica de rebalanceo usando mint/burn del pool real
3. Sistema de métricas y eventos
4. Tests de integración ALM + Pool

### Fase 3: Automatización (1-2 horas)
1. Ejecutor TypeScript con monitoreo de eventos
2. Integración con RamsesV3Pool events
3. Logging y error handling robusto
4. Simulación de actividad para testing

### Fase 4: Frontend (1 hora)
1. Dashboard React con Context API
2. Conexión con contratos usando Ethers.js
3. Display de métricas en tiempo real
4. Controles básicos de testing

### Fase 5: Deploy y Testing (30 mins)
1. Deploy completo en testnet
2. Configuración y start del ejecutor
3. Testing end-to-end con rebalanceos reales
4. Documentación final y video

---

## 13. Comandos de Deploy

```bash
# Setup inicial del proyecto
npm init -y
npm install hardhat ethers @openzeppelin/contracts

# Inicializar Hardhat
npx hardhat init

# Deploy en testnet
npx hardhat run scripts/deploy-tokens.ts --network sonic_testnet
npx hardhat run scripts/deploy-ramses-pool.ts --network sonic_testnet
npx hardhat run scripts/deploy-alm.ts --network sonic_testnet
npx hardhat run scripts/setup-testnet.ts --network sonic_testnet

# Verificar contratos (opcional)
npx hardhat verify --network sonic_testnet <CONTRACT_ADDRESS>

# Ejecutor
cd executor && npm install && npm run build && npm run start

# Frontend
cd frontend && npm install && npm run dev

# Simulación de actividad (en otra terminal)
npx hardhat run scripts/simulate-activity.ts --network sonic_testnet
```

---

## 14. Métricas de Éxito

Al finalizar, el sistema debe demostrar:

### 14.1 Funcionalidad Core
- ✅ RamsesV3Pool deployado y funcional con tokens mock
- ✅ ALMManager integrado correctamente con el pool
- ✅ Rebalanceo automático funcionando (mínimo 3 rebalanceos)
- ✅ Fees siendo capturados y contabilizados

### 14.2 Monitoreo y UI
- ✅ Ejecutor monitoreando eventos del pool en tiempo real
- ✅ UI mostrando métricas actualizadas cada 10-30 segundos
- ✅ Dashboard con posición actual, fees ganados, y historial
- ✅ Transacciones de rebalanceo visibles en explorador

### 14.3 Robustez
- ✅ Sistema corriendo de forma autónoma por al menos 30 minutos
- ✅ Manejo de errores sin crashes
- ✅ Logs claros de todas las operaciones
- ✅ Funciones de emergencia y pausa implementadas

---

## 15. Recursos y Referencias

### 15.1 Documentación Técnica
- RamsesV3: Usar la documentación del protocolo Uniswap V3 como referencia
- Ethers.js v6: https://docs.ethers.org/v6/
- Hardhat: https://hardhat.org/docs/
- React + TypeScript: https://react-typescript-cheatsheet.netlify.app/

### 15.2 Conceptos Clave de Uniswap V3 / RamsesV3
- **Ticks**: Puntos de precio discretos donde puede existir liquidez
- **Tick Spacing**: Separación mínima entre ticks (típicamente 1 para stablecoins)
- **sqrtPriceX96**: Representación del precio como raíz cuadrada en formato Q64.96
- **Liquidez Concentrada**: Proveer liquidez solo en un rango específico de precios

---

Esta guía proporciona todos los elementos necesarios para implementar el ALM completo usando los contratos RamsesV3Pool reales. El enfoque está en la simplicidad del stack frontend mientras mantiene la robustez necesaria para el funcionamiento del sistema automatizado.