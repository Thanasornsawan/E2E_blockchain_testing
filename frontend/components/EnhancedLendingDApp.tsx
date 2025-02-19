import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import StakingTab from './StakingTab';
import { 
    connectWallet, 
    getContracts, 
    formatEther, 
    parseEther,
    getErrorMessage 
  } from '../utils/web3';
import { getContractAddresses } from '../config/contracts';
import { EnhancedLendingProtocol } from "../../typechain/contracts/core/EnhancedLendingProtocol";
import { StakingPool } from "../../typechain/contracts/core/StakingPool";
import { MockWETH } from "../../typechain/contracts/mocks/MockWETH";
import { MockUSDC } from "../../typechain/contracts/mocks/MockUSDC";
import { EnhancedLendingProtocol__factory } from "../../typechain/factories/contracts/core/EnhancedLendingProtocol__factory";
import { StakingPool__factory } from "../../typechain/factories/contracts/core/StakingPool__factory";
import { MockWETH__factory } from "../../typechain/factories/contracts/mocks/MockWETH__factory";
import { MockUSDC__factory } from "../../typechain/factories/contracts/mocks/MockUSDC__factory";

interface EnhancedLendingDAppProps {
    account: string;
    provider: ethers.providers.Web3Provider | null;
    onConnect: () => Promise<void>;
}

interface Position {
  depositAmount: string;
  borrowAmount: string;
  healthFactor: string;
  lastUpdateTime: string;
}

const EnhancedLendingDApp: React.FC<EnhancedLendingDAppProps> = ({ 
    account, 
    provider, 
    onConnect 
  }) => {
    const [chainId, setChainId] = useState<number>();
    const [depositAmount, setDepositAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [borrowAmount, setBorrowAmount] = useState('');
    const [repayAmount, setRepayAmount] = useState('');
    const [position, setPosition] = useState<Position | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [wethAddress, setWethAddress] = useState<string | null>(null);
    const [stakingContract, setStakingContract] = useState<StakingPool | null>(null);
    const [wethContract, setWethContract] = useState<MockWETH | null>(null);
    const [usdcContract, setUsdcContract] = useState<MockUSDC | null>(null);
  
    // Log user actions
    const logAction = (action: string, details: any) => {
        console.log(`User Action - ${action}:`, {
            timestamp: new Date().toISOString(),
            account,
            ...details
        });
    };

    interface Balances {
        weth: string;
    }
    
    const BalanceDisplay: React.FC<{ balances: Balances }> = ({ balances }) => (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium">Available WETH: {balances.weth}</p>
        </div>
    );
    
    const [balances, setBalances] = useState<Balances>({ weth: '0' });
    
    const loadBalances = async () => {
        if (!wethContract || !account) return;
        try {
            const wethBalance = await wethContract.balanceOf(account);
            setBalances({
                weth: ethers.utils.formatEther(wethBalance)
            });
        } catch (err) {
            console.error('Error loading balances:', err);
        }
    };
    
    useEffect(() => {
        if (wethContract && account) {
            loadBalances();
            const interval = setInterval(loadBalances, 10000); // Update every 10 seconds
            return () => clearInterval(interval);
        }
    }, [wethContract, account]);

    useEffect(() => {
      const init = async () => {
        if (provider && account) {
          const network = await provider.getNetwork();
          setChainId(network.chainId);
          await initializeContract(account, provider);
        }
      };
      init();
    }, [provider, account]);

    const initializeContract = async (
        userAddress: string,
        web3Provider: ethers.providers.Web3Provider
      ) => {
        try {
            const signer = web3Provider.getSigner();
            const network = await web3Provider.getNetwork();
            const addresses = getContractAddresses(network.chainId);

            // Initialize core protocol
            const { lendingProtocol } = await getContracts(web3Provider);
            const weth = await lendingProtocol.weth();
            setWethAddress(weth);
          
            // Initialize token contracts
            const wethInstance = MockWETH__factory.connect(addresses.weth, signer);
            const usdcInstance = MockUSDC__factory.connect(addresses.usdc, signer);
            setWethContract(wethInstance);
            setUsdcContract(usdcInstance);

            // Initialize Staking contract
            const stakingInstance = StakingPool__factory.connect(addresses.stakingPool, signer);
            setStakingContract(stakingInstance);

            // Verify token config
            const tokenConfig = await lendingProtocol.tokenConfigs(weth);
            console.log('Token config:', tokenConfig);
            if (!tokenConfig.isSupported) {
                setError('WETH not properly configured in contract');
                return;
            }
            
            await loadUserPosition(userAddress, web3Provider);
            logAction('CONTRACT_INITIALIZED', { 
                weth: addresses.weth,
                usdc: addresses.usdc,
                stakingPool: addresses.stakingPool 
            });
        } catch (err) {
          console.error('Error initializing contract:', err);
          setError('Failed to initialize contract');
        }
    };

    const loadUserPosition = async (
        userAddress: string,
        web3Provider: ethers.providers.Web3Provider
      ) => {
        try {
          const { lendingProtocol } = await getContracts(web3Provider);
          const weth = await lendingProtocol.weth();
          const position = await lendingProtocol.userPositions(weth, userAddress);
          const healthFactor = await lendingProtocol.getHealthFactor(userAddress);
      
          setPosition({
            depositAmount: formatEther(position.depositAmount),
            borrowAmount: formatEther(position.borrowAmount),
            healthFactor: formatEther(healthFactor),
            lastUpdateTime: new Date(position.lastUpdateTime.toNumber() * 1000).toLocaleString()
          });
        } catch (err) {
          console.error('Error loading position:', err);
          setError('Failed to load position');
        }
    };

  const handleConnect = async () => {
    try {
      setError('');
      await onConnect();
    } catch (err) {
      console.error('Connection failed:', err);
      setError('Failed to connect wallet');
    }
  };

  const getSimplifiedErrorMessage = (error: any): string => {
    if (typeof error === 'string') return error;
    
    // Check for common error messages
    const errorString = error?.message || error?.reason || JSON.stringify(error);
    
    if (errorString.includes('Insufficient WETH balance')) {
      return "Cannot borrow more than deposit amount";
    }
    if (errorString.includes('Cannot withdraw more than')) {
      return "Cannot withdraw more than deposited amount";
    }
    if (errorString.includes('Cannot repay more than')) {
      return "Cannot repay more than borrowed amount";
    }
    if (errorString.includes('Insufficient collateral')) {
      return "Insufficient collateral for this action";
    }
    if (errorString.includes('Unhealthy position')) {
      return "Position would become unhealthy after this action";
    }
    
    // Default error message
    return "Transaction failed. Please try again.";
  };

  const handleDeposit = async () => {
    if (!provider || !depositAmount || !wethAddress) return;
    setLoading(true);
    setError('');
    try {
      logAction('DEPOSIT_STARTED', { amount: depositAmount });
      const { lendingProtocol } = await getContracts(provider);
      const signer = provider.getSigner();
      
      console.log('Deposit details:', {
        contract: lendingProtocol.address,
        weth: wethAddress,
        amount: depositAmount,
        signer: await signer.getAddress()
      });
  
      // Direct deposit with ETH - no need for WETH approval
      console.log("Depositing into lending protocol...");
      const lendingDepositTx = await lendingProtocol.deposit(
        wethAddress,
        parseEther(depositAmount),
        { 
          gasLimit: 500000,
          value: parseEther(depositAmount)  // Send ETH with the transaction
        }
      );
      
      console.log('Transaction sent:', lendingDepositTx.hash);
      const receipt = await lendingDepositTx.wait();
      console.log("Lending deposit confirmed, gas used:", receipt.gasUsed.toString());
  
      await loadUserPosition(account, provider);
      await loadBalances(); 
      setDepositAmount('');

      logAction('DEPOSIT_COMPLETED', { 
        amount: depositAmount,
        txHash: receipt.transactionHash 
      });

    } catch (err) {
      console.error('Deposit failed:', err);
      let errorMessage = 'Unknown error';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        if ('error' in err && typeof err.error === 'object' && err.error !== null && 'message' in err.error) {
          errorMessage = String(err.error.message);
        } else if ('reason' in err && typeof err.reason === 'string') {
          errorMessage = err.reason;
        } else if ('message' in err && typeof err.message === 'string') {
          errorMessage = err.message;
        }
      }
      
      setError(`Deposit failed: ${errorMessage}`);
    }
    setLoading(false);
  };

  const handleWithdraw = async () => {
    if (!provider || !withdrawAmount || !wethAddress) return;
    setLoading(true);
    setError('');
    try {
      logAction('WITHDRAW_STARTED', { amount: withdrawAmount });
      const { lendingProtocol } = await getContracts(provider);
      
      // Check current deposit
      const position = await lendingProtocol.userPositions(wethAddress, account);
      if (parseFloat(withdrawAmount) > parseFloat(ethers.utils.formatEther(position.depositAmount))) {
        throw new Error("Cannot withdraw more than deposited amount");
      }
  
      const tx = await lendingProtocol.withdraw(
        wethAddress,
        parseEther(withdrawAmount)
      );
      const receipt = await tx.wait();

      logAction('WITHDRAW_COMPLETED', {
        amount: withdrawAmount,
        txHash: receipt.transactionHash
      });

      await loadUserPosition(account, provider);
      await loadBalances(); 
      setWithdrawAmount('');
    } catch (err) {
      console.error('Withdrawal failed:', err);
      setError(getSimplifiedErrorMessage(err));
    }
    setLoading(false);
  };

  const handleBorrow = async () => {
    if (!provider || !borrowAmount || !wethAddress || !wethContract) return;
    setLoading(true);
    setError('');
    try {
        logAction('BORROW_STARTED', { amount: borrowAmount });
        const { lendingProtocol } = await getContracts(provider);
        
        // Validate borrow amount against deposit
        const position = await lendingProtocol.userPositions(wethAddress, account);
        if (parseFloat(borrowAmount) > parseFloat(ethers.utils.formatEther(position.depositAmount))) {
            throw new Error("Cannot borrow more than deposit amount");
        }

        // Get initial WETH balance for logging
        const initialBalance = await wethContract.balanceOf(account);
        console.log('Initial WETH balance:', ethers.utils.formatEther(initialBalance));

        const tx = await lendingProtocol.borrow(
            wethAddress,
            parseEther(borrowAmount)
        );
        const receipt = await tx.wait();
        
        // Get final WETH balance
        const finalBalance = await wethContract.balanceOf(account);
        console.log('Final WETH balance:', ethers.utils.formatEther(finalBalance));
        
        logAction('BORROW_COMPLETED', {
            amount: borrowAmount,
            txHash: receipt.transactionHash,
            wethBalanceBefore: ethers.utils.formatEther(initialBalance),
            wethBalanceAfter: ethers.utils.formatEther(finalBalance)
        });

        await loadUserPosition(account, provider);
        await loadBalances();
        setBorrowAmount('');
    } catch (err) {
        console.error('Borrow failed:', err);
        logAction('BORROW_FAILED', { error: err });
        setError(getSimplifiedErrorMessage(err));
    }
    setLoading(false);
  };

  const handleRepay = async () => {
    if (!provider || !repayAmount || !wethAddress) return;
    setLoading(true);
    setError('');
    try {
        logAction('REPAY_STARTED', { amount: repayAmount });
      const { lendingProtocol } = await getContracts(provider);
      
      // Check borrow amount first
      const position = await lendingProtocol.userPositions(wethAddress, account);
      if (parseFloat(repayAmount) > parseFloat(ethers.utils.formatEther(position.borrowAmount))) {
        throw new Error("Cannot repay more than borrowed amount");
      }
  
      const tx = await lendingProtocol.repay(
        wethAddress,
        parseEther(repayAmount),
        { value: parseEther(repayAmount) }
      );
      const receipt = await tx.wait();
        
      logAction('REPAY_COMPLETED', {
        amount: repayAmount,
        txHash: receipt.transactionHash
      });
      await loadUserPosition(account, provider);
      await loadBalances(); 
      setRepayAmount('');
    } catch (err) {
      console.error('Repay failed:', err);
      setError(getSimplifiedErrorMessage(err));
    }
    setLoading(false);
  };

  return (
    <Card>
        <CardHeader>
            <CardTitle>Enhanced Lending Protocol</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                <Button
                    onClick={handleConnect}
                    disabled={loading}
                    className="w-full"
                >
                    {account ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}` : 'Connect Wallet'}
                </Button>

                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {position && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                            <p className="text-sm">Deposit: {position.depositAmount} ETH</p>
                            <p className="text-sm">Borrow: {position.borrowAmount} ETH</p>
                        </div>
                        <div>
                            <p className="text-sm">Health Factor: {position.healthFactor}</p>
                            <Progress 
                                value={parseFloat(position.healthFactor) * 10} 
                                className="h-2"
                            />
                            <p className="text-sm mt-2">Last Update: {position.lastUpdateTime}</p>
                        </div>
                    </div>
                )}

                <Tabs defaultValue="deposit" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="deposit">Deposit/Withdraw</TabsTrigger>
                        <TabsTrigger value="borrow">Borrow/Repay</TabsTrigger>
                        <TabsTrigger value="stake">Stake WETH</TabsTrigger>
                    </TabsList>

                    <TabsContent value="deposit">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    type="number"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    placeholder="Amount to deposit"
                                    disabled={loading}
                                />
                                <Button 
                                    onClick={handleDeposit} 
                                    disabled={loading}
                                    className="w-full"
                                >
                                    Deposit
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <Input
                                    type="number"
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    placeholder="Amount to withdraw"
                                    disabled={loading}
                                />
                                <Button 
                                    onClick={handleWithdraw} 
                                    disabled={loading}
                                    className="w-full"
                                >
                                    Withdraw
                                </Button>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="borrow">
                        <div className="space-y-4">
                        <BalanceDisplay balances={balances} />
                            <div className="space-y-2">
                                <Input
                                    type="number"
                                    value={borrowAmount}
                                    onChange={(e) => setBorrowAmount(e.target.value)}
                                    placeholder="Amount to borrow"
                                    disabled={loading}
                                />
                                <Button 
                                    onClick={handleBorrow} 
                                    disabled={loading}
                                    className="w-full"
                                >
                                    Borrow
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <Input
                                    type="number"
                                    value={repayAmount}
                                    onChange={(e) => setRepayAmount(e.target.value)}
                                    placeholder="Amount to repay"
                                    disabled={loading}
                                />
                                <Button 
                                    onClick={handleRepay} 
                                    disabled={loading}
                                    className="w-full"
                                >
                                    Repay
                                </Button>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="stake">
                        <StakingTab
                            account={account}
                            provider={provider}
                            stakingContract={stakingContract}
                            wethContract={wethContract}
                            usdcContract={usdcContract}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </CardContent>
    </Card>
);
};

export default EnhancedLendingDApp;