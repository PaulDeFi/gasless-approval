'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { Provider, utils, Contract } from 'zksync-ethers';
import { erc20ABI } from '../components/contracts';
import { useEthereum } from '../components/Context';
import { SendTransaction } from '../components/SendTransaction'


export default function Page() {
  const { account, getProvider, getSigner } = useEthereum();
  const [tokenAddress, setTokenAddress] = useState('');
  const [contractAddress, setContractAddress] = useState('');
  const [approvalAmount, setApprovalAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [transactionData, setTransactionData] = useState('');


  const handleApproval = async () => {
    try {
      // Validation des entrées utilisateur
      if (!ethers.utils.isAddress(tokenAddress)) {
        setError('Invalid token address');
        return;
      }
      if (!ethers.utils.isAddress(contractAddress)) {
        setError('Invalid contract address');
        return;
      }
      if (isNaN(Number(approvalAmount)) || Number(approvalAmount) <= 0) {
        setError('Invalid approval amount');
        return;
      }

      // Initialisation du provider et du signer depuis useEthereum
      const provider = getProvider();
      const signer = getSigner();

      if (!provider || !signer) {
        setError('Provider or Signer not initialized');
        return;
      }

      // Vérifier si le wallet est connecté
      if (!account?.isConnected) {
        setError('Wallet not connected');
        return;
      }

      // Préparer l'instance de contrat ERC20
      const erc20Contract = new Contract(tokenAddress, erc20ABI, getProvider()!);

      // Préparer la transaction d'approbation
      const approvalTx = await erc20Contract.populateTransaction.approve(
        contractAddress,
        ethers.utils.parseUnits(approvalAmount, 18)
      );

      // Récupération des paramètres de gas sur zkSync
      const zkSyncProvider = new Provider('https://testnet.era.zksync.dev'); // zkSync Era Testnet
      const gasPrice = await zkSyncProvider.getGasPrice();
      const gasLimit = await zkSyncProvider.estimateGasL1(approvalTx);

      // Construire les paramètres pour le Paymaster
      const paymasterParams = utils.getPaymasterParams('<PAYMASTER_ADDRESS>', {
        type: 'ApprovalBased',
        token: tokenAddress,
        minimalAllowance: ethers.BigNumber.from(gasPrice).mul(ethers.BigNumber.from(gasLimit)),
        innerInput: new Uint8Array(),
      });

      // Envoyer la transaction via le signer
      const txResponse = await signer.sendTransaction({
        to: tokenAddress,
        data: approvalTx.data,
        gasPrice,
        gasLimit,
        customData: {
          gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
          paymasterParams,
        },
      });

      console.log('Transaction envoyée:', txResponse.transactionHash);
      await txResponse.wait();
      console.log('Transaction confirmée');
    } catch (err: unknown) {
      const errorMessage = (err as Error).message || 'Une erreur est survenue';
      console.error('Erreur lors de l\'approval:', errorMessage);
      setError(errorMessage);
    }
  };

  return (
    <div>
      <h1>zkSync + ethers v5 + Next.js</h1>
      <form onSubmit={(e) => { e.preventDefault(); handleApproval(); }}>
        <div>
          <label>Token Address:</label>
          <input type="text" value={tokenAddress} onChange={(e) => setTokenAddress(e.target.value)} />
        </div>
        <div>
          <label>Contract Address:</label>
          <input type="text" value={contractAddress} onChange={(e) => setContractAddress(e.target.value)} />
        </div>
        <div>
          <label>Approval Amount:</label>
          <input type="text" value={approvalAmount} onChange={(e) => setApprovalAmount(e.target.value)} />
        </div>
        <button type="submit">Approve</button>
      </form>
      {error && <div style={{ color: 'red' }}>Erreur: {error}</div>}
    </div>
  );
}


