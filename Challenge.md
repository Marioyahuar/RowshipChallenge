# Liquidity Management Challenge

## Context

Build an Automated Liquidity Manager (ALM) strategy for Shadow DEX's stablecoin pool. The goal is to create a system that efficiently manages concentrated liquidity positions to maximize emissions.

## Objective

Create an automated liquidity management system for pool `0x2c13383855377faf5a562f1aef47e4be7a0f12ac` on Shadow DEX.

## Recommended Approach

- Use Claude Code (our standard tool at Rowship) for development
- Deploy to production on Sonic network
- Use https://gas.zip/ to bridge small amounts to Sonic for testing
- Fund with ~$10 USDC for testing (will be reimbursed)
- **Strategy: Always keep liquidity in exactly the active tick only**
- Show on-chain executor transactions rebalancing positions

## Core Considerations

- **Strategy: Always keep liquidity in exactly the active tick only**
- **Use as narrow a range as possible**
- Approach this as if you're trying to maximize yield and profit from this strategy
- Outline your thoughts in the readme about profitability considerations
- What metrics would you track to measure success?
- What risks could eat into your profits and how would you mitigate them?

## Deliverables

1. Smart contract implementation
2. Monitoring/execution service (implemented in TypeScript)
3. Simple UI (built with React) that displays:
   - Your ALM's current balance (dynamically fetched)
   - Current emissions allocated to this pool (in USD)
   - Both values should update in real-time from on-chain data
4. Readme explaining your approach and trade-offs

## Discussion Topics

Be prepared to discuss:

- Your design decisions and alternatives considered
- Trade-offs in your implementation
- How you'd handle various edge cases
- Potential improvements or extensions

## Resources

- Shadow DEX: https://www.shadow.so/

## Submission Requirements

1. Submit your code via GitHub repository
2. **Record a video walkthrough in English and send via a message** covering:
   - Demo of your live UI showing ALM balances and pool emissions
   - Show a live rebalancing transaction that executed
   - Overview of how your solution works end-to-end
   - Walk through your code and architecture
   - Explain security measures to protect user funds
   - Discuss known limitations and areas for improvement
   - Next steps you would take to productionize
3. Include links to:
   - Deployed contract address
   - UI deployment (ideally on Vercel, keep executor running post-submission)
   - Example rebalancing transactions

## Time Estimate

3-6 hours for a senior developer using Claude Code

## Note

Using AI tools is acceptable, but you should fully understand your solution's mechanics, limitations, and design rationale. Make sure any outputs in the readme actually make sense and you agree with.
