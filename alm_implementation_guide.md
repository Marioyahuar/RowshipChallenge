# Technical Implementation Guide: Automated Liquidity Manager (ALM) - Testnet

## 1. Project Overview

### Main Objective
Develop an automated liquidity management system (ALM) that maintains concentrated positions on the exact active tick of a stablecoin pool, maximizing fee and emission capture through automatic rebalancing.

### System Components
- **Smart Contracts**: RamsesV3Pool + ALM Manager + Mock Tokens
- **Executor/Monitor**: TypeScript service that detects tick changes and executes rebalancing
- **Frontend**: React UI showing real-time metrics
- **Testnet**: Complete simulated environment with mock tokens

---

## 2. System Architecture

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
1. **FakeUSDC.sol** - Simulated ERC20 token
2. **FakeSCUSD.sol** - Simulated ERC20 token  
3. **RamsesV3Pool** - Real DEX pool (use existing contracts in RamsesV3Pool/ folder)
4. **ALMManager.sol** - Main ALM contract
5. **RamsesV3Factory** - Ramses protocol factory (if available)

### 2.2 Executor Service
- **Continuous monitoring** of the pool's current tick
- **Change detection** requiring rebalancing
- **Automatic execution** of rebalancing transactions
- **Logging and performance metrics**

### 2.3 Frontend
- **Real-time dashboard** with ALM metrics
- **Current position visualization** and history
- **Manual controls** for testing
- **Connection status** with contracts

---

## 3. Technology Stack

### 3.1 Smart Contracts
- **Language**: Solidity ^0.8.19
- **Framework**: Hardhat
- **Libraries**: OpenZeppelin Contracts
- **Testing**: Hardhat + Waffle/Chai
- **Pool**: RamsesV3Pool (existing contracts)

### 3.2 Executor
- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Blockchain Interaction**: Ethers.js v6
- **Scheduler**: node-cron or setInterval
- **Logging**: Winston

### 3.3 Frontend (Simplified Stack)
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Blockchain**: Ethers.js v6
- **State**: React Context API
- **HTTP Client**: Native Fetch API

### 3.4 Deployment
- **Contracts**: Hardhat deploy scripts
- **Frontend**: Vercel
- **Executor**: VPS or cloud service (kept running)

---

## 4. Mock Tokens

### 4.1 FakeUSDC
```solidity
contract FakeUSDC is ERC20 {
    constructor() ERC20("Fake USD Coin", "fUSDC") {
        _mint(msg.sender, 1000000 * 10**6); // 1M tokens, 6 decimals
    }
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount); // For testing
    }
}
```

### 4.2 FakeSCUSD
```solidity
contract FakeSCUSD is ERC20 {
    constructor() ERC20("Fake Shadow USD", "fscUSD") {
        _mint(msg.sender, 1000000 * 10**18); // 1M tokens, 18 decimals
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount); // For testing
    }
}
```

---

## 5. RamsesV3Pool Implementation

### 5.1 Using Existing Contracts
**IMPORTANT**: Use the RamsesV3Pool contracts you already have in the `RamsesV3Pool/` folder. These contracts are the real protocol implementation and provide:

- Concentrated liquidity management by ticks
- Swaps with real price logic
- Robust fee system
- Complete events for monitoring

### 5.2 Key RamsesV3Pool Functions
Main functions that the ALM will need to use:
- `mint()` - Add concentrated liquidity
- `burn()` - Remove liquidity
- `collect()` - Collect accumulated fees
- `swap()` - Execute swaps (for testing)
- `slot0()` - Get current tick and price
- `positions()` - Query existing positions

### 5.3 Important Events to Monitor
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
    int24 public constant TICK_SPACING = 1; // For stablecoins
    
    event Rebalanced(int24 oldTickLower, int24 oldTickUpper, int24 newTickLower, int24 newTickUpper);
    event FeesCollected(uint256 amount0, uint256 amount1);
    
    function rebalance() external;
    function emergencyWithdraw() external onlyOwner;
    function getALMMetrics() external view returns (ALMState memory);
    function getCurrentPoolState() external view returns (int24 currentTick, uint160 sqrtPriceX96);
}
```

### 6.2 Rebalancing Strategy
1. **Monitor**: Check if `IRamsesV3Pool(pool).slot0().tick` != `almState.currentTickLower`
2. **Remove**: `IRamsesV3Pool(pool).burn()` to remove current liquidity
3. **Collect**: `IRamsesV3Pool(pool).collect()` to collect accumulated fees
4. **Add**: `IRamsesV3Pool(pool).mint()` on the new active tick (current tick, current tick + TICK_SPACING)
5. **Update**: Update internal state and emit events

### 6.3 Metrics to Track
- Total active liquidity
- Fees collected per period (token0 and token1)
- Number of successful rebalances
- Average time out of range
- Gas cost vs fees earned ratio
- Effective ALM APY

---

## 7. Inputs/Outputs System

### 7.1 System Inputs
```typescript
interface SystemInputs {
  poolAddress: string;
  almManagerAddress: string;
  rebalanceThreshold: number; // In ticks
  monitoringInterval: number; // In seconds
  gasLimit: number;
  slippageTolerance: number;
  minLiquidityThreshold: string; // Minimum liquidity to operate
}
```

### 7.2 Expected Outputs
```typescript
interface ALMMetrics {
  currentPosition: {
    tickLower: number;
    tickUpper: number;
    liquidity: string;
  };
  performance: {
    totalFeesEarned0: string; // In token0
    totalFeesEarned1: string; // In token1
    totalFeesEarnedUSD: string; // Estimated in USD
    rebalanceCount: number;
    successRate: number;
    avgTimeInRange: number;
    currentAPY: number;
  };
  poolData: {
    currentTick: number;
    sqrtPriceX96: string;
    totalLiquidity: string;
    token0Price: string; // In terms of token1
  };
}
```

---

## 8. Repository Structure

```
alm-testnet-project/
├── contracts/                 # Smart contracts
│   ├── tokens/
│   │   ├── FakeUSDC.sol
│   │   └── FakeSCUSD.sol
│   ├── RamsesV3Pool/          # Existing RamsesV3 contracts
│   │   ├── RamsesV3Pool.sol   # (use contracts you already have)
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

## 9. Testnet Configuration

### 9.1 Recommended Network
**First option**: Sonic Testnet
- Explorer: https://explorer.sonic.global
- Faucet: https://faucet.sonic.global
- ChainID: 64165

**Alternative**: Sepolia
- More stable, better documented
- Public faucets available
- ChainID: 11155111

### 9.2 Hardhat Setup
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

### 9.3 Environment Variables (.env)
```bash
PRIVATE_KEY=your_private_key_here
SONIC_RPC_URL=https://rpc.testnet.soniclabs.com
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 9.4 Activity Simulation
To generate tick changes and testing, create a script that makes small swaps:
```typescript
// scripts/simulate-activity.ts
async function simulateTrading() {
  const pool = await ethers.getContractAt("RamsesV3Pool", POOL_ADDRESS);
  
  // Alternate small swaps to change the tick
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
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
  }
}
```

---

## 10. Security Considerations

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

### 10.2 Critical Validations
- **Slippage limits** on all swap/mint/burn operations
- **Gas limit checks** before rebalancing
- **Minimum liquidity** requirements
- **Tick validation** (within valid ranges)
- **Balance checks** before and after operations
- **Circuit breakers** if excessive losses occur

### 10.3 Frontend Security
- **Input sanitization** on all forms
- **Contract address validation** with checksums
- **Transaction confirmation** before submit
- **Robust connection state management**
- **Comprehensive error handling**

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
  // ... rest of implementation
};
```

---

## 12. Suggested Development Flow

### Phase 1: Foundation (1-2 hours)
1. Project setup with Hardhat
2. Deploy mock tokens (FakeUSDC, FakeSCUSD)
3. Deploy RamsesV3Pool using existing contracts
4. Basic pool functionality tests

### Phase 2: ALM Core (2-3 hours)
1. Implement ALMManager with RamsesV3Pool integration
2. Rebalancing logic using real pool mint/burn
3. Metrics and events system
4. ALM + Pool integration tests

### Phase 3: Automation (1-2 hours)
1. TypeScript executor with event monitoring
2. Integration with RamsesV3Pool events
3. Robust logging and error handling
4. Activity simulation for testing

### Phase 4: Frontend (1 hour)
1. React dashboard with Context API
2. Contract connection using Ethers.js
3. Real-time metrics display
4. Basic testing controls

### Phase 5: Deploy and Testing (30 mins)
1. Complete testnet deployment
2. Executor configuration and startup
3. End-to-end testing with real rebalances
4. Final documentation and video

---

## 13. Deploy Commands

```bash
# Initial project setup
npm init -y
npm install hardhat ethers @openzeppelin/contracts

# Initialize Hardhat
npx hardhat init

# Deploy on testnet
npx hardhat run scripts/deploy-tokens.ts --network sonic_testnet
npx hardhat run scripts/deploy-ramses-pool.ts --network sonic_testnet
npx hardhat run scripts/deploy-alm.ts --network sonic_testnet
npx hardhat run scripts/setup-testnet.ts --network sonic_testnet

# Verify contracts (optional)
npx hardhat verify --network sonic_testnet <CONTRACT_ADDRESS>

# Executor
cd executor && npm install && npm run build && npm run start

# Frontend
cd frontend && npm install && npm run dev

# Activity simulation (in another terminal)
npx hardhat run scripts/simulate-activity.ts --network sonic_testnet
```

---

## 14. Success Metrics

Upon completion, the system must demonstrate:

### 14.1 Core Functionality
- ✅ RamsesV3Pool deployed and functional with mock tokens
- ✅ ALMManager correctly integrated with the pool
- ✅ Automatic rebalancing working (minimum 3 rebalances)
- ✅ Fees being captured and accounted for

### 14.2 Monitoring and UI
- ✅ Executor monitoring pool events in real-time
- ✅ UI showing updated metrics every 10-30 seconds
- ✅ Dashboard with current position, fees earned, and history
- ✅ Rebalancing transactions visible in explorer

### 14.3 Robustness
- ✅ System running autonomously for at least 30 minutes
- ✅ Error handling without crashes
- ✅ Clear logs of all operations
- ✅ Emergency and pause functions implemented

---

## 15. Resources and References

### 15.1 Technical Documentation
- RamsesV3: Use Uniswap V3 protocol documentation as reference
- Ethers.js v6: https://docs.ethers.org/v6/
- Hardhat: https://hardhat.org/docs/
- React + TypeScript: https://react-typescript-cheatsheet.netlify.app/

### 15.2 Key Uniswap V3 / RamsesV3 Concepts
- **Ticks**: Discrete price points where liquidity can exist
- **Tick Spacing**: Minimum separation between ticks (typically 1 for stablecoins)
- **sqrtPriceX96**: Price representation as square root in Q64.96 format
- **Concentrated Liquidity**: Providing liquidity only in a specific price range

---

This guide provides all necessary elements to implement the complete ALM using real RamsesV3Pool contracts. The focus is on frontend stack simplicity while maintaining the robustness needed for automated system operation.