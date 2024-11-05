'use client';
import { useRouter } from 'next/router';
import { useEthereum } from '../components/Context';
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { Contract } from 'zksync-ethers';
import { erc20ABI } from '../components/contracts'

import { Connect } from '../components/Connect'
import { Account } from '../components/Account'
import { NetworkSwitcher } from '../components/NetworkSwitcher'
import { Balance } from '../components/Balance'
import { BlockNumber } from '../components/BlockNumber'
import { ReadContract } from '../components/ReadContract'
import { SendTransaction } from '../components/SendTransaction'
import { SendTransactionPrepared } from '../components/SendTransactionPrepared'
import { SignMessage } from '../components/SignMessage'
import { SignTypedData } from '../components/SignTypedData'
import { Token } from '../components/Token'
import { WatchContractEvents } from '../components/WatchContractEvents'
import { WatchPendingTransactions } from '../components/WatchPendingTransactions'
import { WriteContract } from '../components/WriteContract'
import { WriteContractPrepared } from '../components/WriteContractPrepared'


// Define answer for the API
interface ApiResponse {
  txData: ethers.providers.TransactionRequest;
  
}

export default function Page() {
  const {account, getProvider, getSigner} = useEthereum();
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [tokenAddress, setTokenAddress] = useState('');
  const [sponsorshipRatio, setSponsorshipRatio] = useState(0);
  const [contractAddress, setContractAddress] = useState('');
  const [transactionData, setTransactionData] = useState('');
  const [inProgress, setProgress] = useState<Boolean>(false);
  const [error, setError] = useState<String | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [approvalAmount, setApprovalAmount] = useState<any>(null);
  const handleApproval = async () => {
  if(!ethers.utils.isAddress(tokenAddress)){
    setError("Invalid token address");
    return;
  }
  if(!ethers.utils.isAddress(contractAddress)){
    setError("Invalid contract address");
    return;
  }
  if(approvalAmount <0){
    setError("Invalid approvalAmount");
    return;
  }
  const contract = new Contract(tokenAddress, erc20ABI, getProvider()!);

  const rawTx = await contract.populateTransaction.approve(ethers.utils.getAddress(contractAddress), approvalAmount);
    if (!account.isConnected) {
      console.error("Wallet not connected");
      return;
    }

    try {
      // API Payload
      const payload = {
        // feeTokenAddress: tokenAddress,
        sponsorshipRatio: 100,
        replayLimit: 5,
        txData: {
          from: ethers.utils.getAddress(account.address),
          to: ethers.utils.getAddress(tokenAddress),
          data: rawTx.data,
        }
      };
      console.log("ok - payload créé:", payload);

      // API Post Request
      const response = await fetch('https://api.zyfi.org/api/erc20_sponsored_paymaster/v1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': `${process.env.NEXT_PUBLIC_ZYFI_API_KEY}`, // Replace by your API key
        },
        body: JSON.stringify(payload),
      });
      console.log("ok - requête API envoyée");


      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setApiResponse(data); // Stock API answer
      console.log(data);
      console.log("ok - requête prête");
      await getSigner()?.sendTransaction(data.txData); // Send the transaction to metasmask for signature
    } catch (error) {
      console.error('Error during the API call:', error);
    }
  };
  
  return (
    <div>
      <h1>zkSync + ethers v5 + Next.js</h1>

      <Connect />

      {account.isConnected && (
        <>
          <hr />
          <h2>Network</h2>
          <p>
            <strong>Make sure to connect your wallet to zkSync Testnet for full functionality</strong>
            <br />
            or update to a different contract address
          </p>
          <NetworkSwitcher />
          <br />
          <hr />
          <h2>Account</h2>
          <Account />
          <br />
          <hr />
          <h2>Balance</h2>
          <Balance />
          <br />
          <hr />
          <h2>Approval Form</h2>
          <form onSubmit={e => { e.preventDefault(); handleApproval(); }}>
            <div>
              <label>Token Address:</label>
              <input type="text" value={tokenAddress} onChange={e => setTokenAddress(e.target.value)} />
            </div>
            <div>
              <label>Contract Address:</label>
              <input type="text" value={contractAddress} onChange={e => setContractAddress(e.target.value)} />
            </div>
            <div>
              <label>Amount:</label>
              <input type="text" value={approvalAmount} onChange={e => setApprovalAmount(e.target.value)} />
            </div>
            <button type="submit">Approve</button>
          </form>
          {inProgress ? (
        <div>Fetching token...</div>
      ) : result ? (
        <pre>{JSON.stringify(result, null, 4)}</pre>
      ) : error ? (
        <div>Error: {error}</div>
      ) : null}
        </>
      )}
  
    </div>
  )
}
