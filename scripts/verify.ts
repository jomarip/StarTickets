import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { avalanche } from "@thirdweb-dev/chains";
import dotenv from "dotenv";

dotenv.config();


const sdk = ThirdwebSDK.fromPrivateKey(
  process.env.PRIVATE_KEY, // Your wallet's private key (only required for write operations)
  "avalanche",
  {
    clientId: "3c70f05ca87e5107d15d62c5adbb6ff4", // Use client id if using on the client side, get it from dashboard settings
    secretKey: "d_zxkysACI6D4Xj7qt5ixM_0hTUJZhVO0xqjZpqtY5Pw2iZkJpdS1DzfGesm0mNJQAJszBiZdc2sG9qoMXlFhg", // Use secret key if using on the server, get it from dashboard settings
  },
);

const contractAddress = "0x929FBbbDec4f51c23C2CA403C1C7f20F9Cd780fd";
const explorerAPIUrl = "https://api.snowtrace.io/api"; // e.g. https://api.etherscan.io/api
const explorerAPIKey = "XG4N5PQUVYT1IHG82RJVJV44ZENZYQBIEU"; // Generate API key on the explorer

(async () => {
    await sdk.verifier.verifyContract(
      contractAddress,
      explorerAPIUrl,
      explorerAPIKey,
    );
})().catch(err => console.error(err));