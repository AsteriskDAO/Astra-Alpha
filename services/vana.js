const ethers = require('ethers');
const { serverSideEncrypt } = require('../utils/crypto.js');
const DataLiquidityPoolABI = require("../contracts/DataLiquidityPoolLightImplementation.json");
const TeePoolImplementationABI = require("../contracts/TeePoolImplementation.json");
const DataRegistryImplementationABI = require("../contracts/DataRegistryImplementation.json");

const contractAddress = "0xE317bF090911AF03fEa09c1707Ec370EdFf8C0A8";
const dataRegistryContractAddress = "0xEA882bb75C54DE9A08bC46b46c396727B4BFe9a5";
const teePoolContractAddress = "0xF084Ca24B4E29Aa843898e0B12c465fAFD089965";

const provider = new ethers.JsonRpcProvider("https://rpc.moksha.vana.org");

const handleFileUpload = async (file) => {
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY
    const wallet = new ethers.Wallet(privateKey, provider);
    const signature = await wallet.signMessage("Please sign to retrieve your encryption key");
    const encryptedData = await serverSideEncrypt(file, signature);

    const signer = wallet.connect(provider);

    const dlpContract = new ethers.Contract(contractAddress, DataLiquidityPoolABI.abi, signer);
    const dataRegistryContract = new ethers.Contract(dataRegistryContractAddress, DataRegistryImplementationABI.abi, signer);
    const teePoolContract = new ethers.Contract(teePoolContractAddress, TeePoolImplementationABI.abi, signer);

    const publicKey = await dlpContract.masterKey();
    const encryptedKey = await encryptWithWalletPublicKey(signature, publicKey);

    const tx = await dataRegistryContract.addFileWithPermissions(encryptedData, wallet.address, [
        // DLP contract.
        { account: contractAddress, key: encryptedKey }
    ]);
    const receipt = await tx.wait();

    const uploadedFileId = receipt.logs?.[0]?.args?.[0]?.toNumber() || null;
    if (!uploadedFileId) throw new Error("Failed to retrieve file ID");

    // TeePool sets up the verification jobs on the files.
    const teeFee = await teePoolContract.teeFee();
    const contributionProofTx = await teePoolContract.requestContributionProof(uploadedFileId, { value: teeFee });
    await contributionProofTx.wait();

    // const claimTx = await dlpContract.requestReward(uploadedFileId, 1);
    // await claimTx.wait();

    return { uploadedFileId, message: "File uploaded & reward requested successfully" };
};

module.exports = { handleFileUpload };


// DLP is only needed at the last stpe for rewarding the contributor
// aka points

