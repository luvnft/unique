import { ChangeEvent, useState } from "react";
import { useParams } from "react-router-dom";
import { ethers } from "ethers";
import { Address } from "@unique-nft/utils";
import { useAccountsContext } from "../accounts/AccountsContext";
import { Account, SignerTypeEnum } from "../accounts/types";
import { Modal } from "../components/Modal";

import { useUniqueNFTFactory } from "../hooks/useUniqueNFTFactory";
import { ContentWrapper } from "./NestModal";
import { Button, ButtonWrapper, Loading } from "./UnnestModal";
import { switchNetwork } from "../utils/swithChain";

import { getCollection } from "../utils/getCollection";
import { useSdkContext } from "../sdk/SdkContext";

type TransferNFTModalProps = {
  isVisible: boolean;
  account?: Account;
  onClose(): void;
};

export const TransferNFTModal = ({
  isVisible,
  onClose,
}: TransferNFTModalProps) => {
  const { selectedAccount, magic, providerWeb3Auth } = useAccountsContext();
  const { sdk } = useSdkContext();
  const { tokenId, collectionId } = useParams<{
    tokenId: string;
    collectionId: string;
  }>();
  const [receiver, setReceiver] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onMessageChange = (e: ChangeEvent<HTMLInputElement>) => {
    setReceiver(e.target.value);
  };

  const { getUniqueNFTFactory } = useUniqueNFTFactory(collectionId);

  const onSign = async () => {
    if (!sdk || !receiver || !selectedAccount || !collectionId || !tokenId) {
      setErrorMessage("All fields must be filled out.");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (selectedAccount.signerType === SignerTypeEnum.Ethereum) {
        await switchNetwork();
        const collection = await getUniqueNFTFactory();
        if (!collection) {
          setErrorMessage("Failed to initialize NFT collection.");
          setIsLoading(false);
          return;
        }

        const fromCross = Address.extract.ethCrossAccountId(
          selectedAccount.address
        );
        const toCross = Address.extract.ethCrossAccountId(receiver.trim());
        await (
          await collection.transferFromCross(fromCross, toCross, +tokenId)
        ).wait();
      } else if (
        selectedAccount.signerType === SignerTypeEnum.Magiclink ||
        selectedAccount.signerType === SignerTypeEnum.Web3Auth
      ) {
        const provider = selectedAccount.signerType === SignerTypeEnum.Magiclink
          ? magic?.rpcProvider
          : providerWeb3Auth;

        if (!provider) {
          throw new Error(`No provider for ${selectedAccount.signerType}`);
        }

        await transferNFTWithProvider(
          provider,
          collectionId,
          tokenId,
          selectedAccount.address,
          receiver.trim()
        );
      } else {
        await sdk.token.transfer({
          to: receiver.trim(),
          collectionId,
          tokenId: +tokenId,
        });
      }

      setIsLoading(false);
      window.location.reload();
    } catch (error) {
      console.error("Transfer failed:", error);
      setErrorMessage("An error occurred");
      setIsLoading(false);
    }
  };

  const transferNFTWithProvider = async(
    provider: ethers.Eip1193Provider,
    collectionId: string,
    tokenId: string,
    fromAddress: string,
    toAddress: string
  ) => {
    const collection = await getCollection(provider, collectionId);
    const fromCross = Address.extract.ethCrossAccountId(fromAddress);
    const toCross = Address.extract.ethCrossAccountId(toAddress.trim());
    await (await collection.transferFromCross(fromCross, toCross, +tokenId)).wait();
  }

  return (
    <Modal isVisible={isVisible} onClose={onClose} isFlexible={true}>
      <ContentWrapper>
        <h3>Transfer NFT</h3>
        <div className="form-item">
          <input
            type="text"
            placeholder="Enter address to transfer"
            value={receiver}
            onChange={onMessageChange}
          />
        </div>

        {errorMessage && (
          <div className="form-item">
            <div className="error-message">{errorMessage}</div>
          </div>
        )}

        {isLoading && <Loading>Processing...</Loading>}
        <ButtonWrapper>
          <Button onClick={onSign} disabled={isLoading}>
            Submit
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </ButtonWrapper>
      </ContentWrapper>
    </Modal>
  );
};
