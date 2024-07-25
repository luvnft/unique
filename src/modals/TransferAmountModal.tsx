import { ChangeEvent, useContext, useState } from "react"
import { UniqueFungibleFactory } from "@unique-nft/solidity-interfaces"
import { Address } from "@unique-nft/utils"
import { isEthersSigner } from "../accounts/AccountsManager"
import { Account } from "../accounts/types"
import { Modal } from "../components/Modal"
import { baseUrl } from "../sdk/SdkContext"
import { connectSdk } from "../sdk/connect"
import { AccountsContext } from "../accounts/AccountsContext"

type TransferAmountModalProps = {
  isVisible: boolean
  sender?: Account
  onClose(): void
}

export const TransferAmountModal = ({isVisible, sender, onClose}: TransferAmountModalProps) => {
  const { fetchPolkadotAccounts } = useContext(AccountsContext);
  const [receiverAddress, setReceiverAddress] = useState<string>('');
  const [amount, setAmount] = useState<number | string>('');
  const [isLoading, setIsLoading] = useState(false);

  const onReceiverAddressChange = (e: ChangeEvent<HTMLInputElement>) => {
    setReceiverAddress(e.target.value);
  }

  const onAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || Number(value)) {
      setAmount(value);
    }
  }

  const onSend = async () => {
    if(!receiverAddress || !amount || !sender) return;
    setIsLoading(true);

    if(isEthersSigner(sender.signer)) {
      const from = Address.extract.ethCrossAccountId(sender.address);
      const to = Address.extract.ethCrossAccountId(receiverAddress);
      const uniqueFungible = await UniqueFungibleFactory(0, sender.signer);
      const amountRaw = BigInt(amount) * BigInt(10) ** BigInt(18);

      await (await uniqueFungible.transferFromCross(from, to, amountRaw, { from: sender.address })).wait();
    } else {
      try {
        //@ts-ignore
        const sdk = await connectSdk(baseUrl, sender);

        await sdk?.balance.transfer({
          to: receiverAddress,
          amount: `${amount}`,
          isAmountInCoins: true,
        });
        setIsLoading(false);

        //refetch accounts balances
        fetchPolkadotAccounts();
      } catch(err) {
        console.log(err, 'ERROR');
        setIsLoading(false);
      }
    }
    onClose();
  }

  if(!sender) return null;

  return (
    <Modal 
      title="Transfer"
      isVisible={isVisible} 
      onClose={onClose} 
    >
      <div className="form-item">
        <input 
          type="text" 
          placeholder="Receiver address" 
          value={receiverAddress}
          onChange={onReceiverAddressChange} 
        />
      </div>
      <div className="form-item">
        <input 
          type="text" 
          placeholder="Amount" 
          value={amount}
          onChange={onAmountChange} 
        />
      </div>
      {isLoading && (
        <div className="form-item">
          <div>Transferring...</div>
        </div>
      )}
      <div className="form-item">
        <button onClick={onSend} disabled={isLoading}>Send</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}
