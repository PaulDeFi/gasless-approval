'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { Provider, utils, Contract } from 'zksync-ethers'; // zkSync SDK
import { erc20ABI } from '../components/contracts';

export default function Page() {
  const [tokenAddress, setTokenAddress] = useState(''); // Chaîne vide par défaut
  const [contractAddress, setContractAddress] = useState(''); // Chaîne vide par défaut
  const [approvalAmount, setApprovalAmount] = useState(''); // Chaîne vide par défaut
  const [error, setError] = useState(null);

  if (!ethers.utils.isAddress(tokenAddress)) {
    setError('Invalid token address');
    return;
  }
  if (!ethers.utils.isAddress(contractAddress)) {
    setError('Invalid contract address');
      return;
    }
    if (parseFloat(approvalAmount) <= 0) {
      setError('Invalid approval amount');
      return;
    }

      // Initialisation du provider et signer
      const provider = new Provider("https://testnet.era.zksync.dev"); // URL officielle du testnet zkSync Era
      const signer = new ethers.providers.Web3Provider(window.ethereum).getSigner(); // Metamask signer

      // Préparer l'instance de contrat ERC20
      const erc20Contract = new Contract(tokenAddress, erc20ABI, signer);

      // Préparer la transaction d'approbation
      const approvalTx = await erc20Contract.populateTransaction.approve(
        contractAddress,
        ethers.utils.parseUnits(approvalAmount, 18)
      );

      // Récupération des paramètres de gas
      const gasPrice = await provider.getGasPrice(); // Prix du gas sur zkSync
      const gasLimit = await signer.estimateGas(approvalTx); // Limite de gas estimée

      // Construire les paramètres pour le Paymaster
      const paymasterParams = utils.getPaymasterParams('<PAYMASTER_ADDRESS>', {
        type: 'ApprovalBased',
        token: tokenAddress,
        minimalAllowance: ethers.BigNumber.from(gasPrice).mul(ethers.BigNumber.from(gasLimit)),
        innerInput: new Uint8Array(),
      });

      // Envoi de la transaction avec customData
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

      console.log('Transaction envoyée:', txResponse.hash);
      await txResponse.wait();
      console.log('Transaction confirmée');
    } catch (err) {
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

