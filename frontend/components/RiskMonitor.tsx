import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Alert, AlertDescription } from "../components/ui/alert";
import { APIIntegrationManager } from "../../typechain/contracts/integration/APIIntegrationManager";
import { ethers } from 'ethers';

interface RiskMetrics {
  healthFactor: string;
  liquidationRisk: string;
  liquidationHealthFactor: string;
  safetyRating: 'High' | 'Medium' | 'Low';
}

const RiskMonitor = ({
  apiManager,
  userAddress
}: {
  apiManager: APIIntegrationManager | null;
  userAddress: string;
}) => {
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (apiManager && userAddress) {
      loadRiskMetrics();
      const interval = setInterval(loadRiskMetrics, 30000);
      return () => clearInterval(interval);
    }
  }, [apiManager, userAddress]);

  const loadRiskMetrics = async () => {
    if (!apiManager || !userAddress) return;
  
    setLoading(true);
    try {
      const healthFactor = await apiManager.getHealthFactor(userAddress);
      // Also get the liquidation health factor
      const liquidationHealthFactor = await apiManager.getLiquidationHealthFactor(userAddress);
      
      const wethAddress = await apiManager.weth();
      const position = await apiManager.userPositions(wethAddress, userAddress);
  
      const healthFactorNumber = parseFloat(ethers.utils.formatUnits(healthFactor, 4));
      const liquidationHealthFactorNumber = parseFloat(ethers.utils.formatUnits(liquidationHealthFactor, 4));
      
      // Use liquidation health factor when calculating liquidation risk
      let liquidationRiskValue = '0';
      if (liquidationHealthFactorNumber > 1000000) {
        liquidationRiskValue = '0';
      } else if (liquidationHealthFactorNumber < 0.01) {
        liquidationRiskValue = '100';
      } else {
        liquidationRiskValue = Math.min(100, (100 / liquidationHealthFactorNumber)).toFixed(2);
      }
  
      let safetyRating: 'High' | 'Medium' | 'Low';
      if (liquidationHealthFactorNumber >= 2) {
        safetyRating = 'High';
      } else if (liquidationHealthFactorNumber >= 1.5) {
        safetyRating = 'Medium';
      } else {
        safetyRating = 'Low';
      }
  
      setRiskMetrics({
        healthFactor: healthFactorNumber.toFixed(2),
        liquidationHealthFactor: liquidationHealthFactorNumber.toFixed(2),
        liquidationRisk: liquidationRiskValue,
        safetyRating
      });
    } catch (err) {
      console.error('Error loading risk metrics:', err);
      setError('Failed to load risk metrics');
    } finally {
      setLoading(false);
    }
  }; 

  const getSafetyColor = (rating: 'High' | 'Medium' | 'Low') => {
    switch (rating) {
      case 'High':
        return 'bg-green-100 text-green-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return 'bg-red-100 text-red-800';
    }
  };

  const getHealthFactorColor = (factor: number) => {
    if (factor >= 2) return 'text-green-600';
    if (factor >= 1.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Monitor</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : loading ? (
          <div className="text-center py-4">Loading risk metrics...</div>
        ) : riskMetrics ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Safety Rating</h3>
              <Badge className={getSafetyColor(riskMetrics.safetyRating)}>
                {riskMetrics.safetyRating}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Health Factor</span>
                <span className={getHealthFactorColor(parseFloat(riskMetrics.liquidationHealthFactor))}>
                  {riskMetrics.liquidationHealthFactor}
                </span>
              </div>
              <Progress 
                value={parseFloat(riskMetrics.liquidationHealthFactor) * 33.33}
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Liquidation Risk</span>
                <span className={parseFloat(riskMetrics.liquidationRisk) > 50 ? 'text-red-600' : 'text-green-600'}>
                  {riskMetrics.liquidationRisk}%
                </span>
              </div>
              <Progress 
                value={parseFloat(riskMetrics.liquidationRisk)}
                className="h-2"
              />
            </div>

            {parseFloat(riskMetrics.liquidationHealthFactor) < 1.2 && (
              <Alert variant="destructive">
                <AlertDescription>
                  Your position is approaching liquidation threshold. Consider adding more collateral or repaying debt.
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default RiskMonitor;