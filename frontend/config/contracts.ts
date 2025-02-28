// THIS FILE IS AUTO-GENERATED. DO NOT EDIT DIRECTLY.
// Last updated: 2025-02-27T07:29:15.072Z
// Network updated: local

export const CONTRACT_ADDRESSES = {
  "local": {
    "weth": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "usdc": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    "lendingProtocol": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    "enhancedLendingProtocol": "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
    "priceOracle": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    "apiManager": "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
    "stakingPool": "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e"
  },
  "mainnet": {
    "weth": "0xC070A317F23E9A4e982e356485416251dd3Ed944",
    "usdc": "0x6D39d71fF4ab56a4873febd34e1a3BDefc01b41e",
    "enhancedLendingProtocol": "0xe3EF345391654121f385679613Cea79A692C2Dd8",
    "priceOracle": "0x6D39d71fF4ab56a4873febd34e1a3BDefc01b41e",
    "apiManager": "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
    "stakingPool": "0x6C2d83262fF84cBaDb3e416D527403135D757892"
  }
};

export const CHAIN_IDS = {
    local: 31337,
    mainnet: 1
};

export interface ContractAddresses {
    weth: string;
    usdc: string;
    enhancedLendingProtocol: string;
    priceOracle: string;
    apiManager: string;
    lendingProtocol?: string;
    stakingPool: string;
}

export function getContractAddresses(chainId: number): ContractAddresses {
    switch (chainId) {
        case CHAIN_IDS.local:
            return CONTRACT_ADDRESSES.local;
        case CHAIN_IDS.mainnet:
            return CONTRACT_ADDRESSES.mainnet;
        default:
            throw new Error(`Unsupported chain ID: ${chainId}`);
    }
}
