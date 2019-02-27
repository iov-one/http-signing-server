import Koa from "koa";
import bodyParser from "koa-bodyparser";

import { bnsConnector } from "@iov/bns";
import { JsonRpcSigningServer, MultiChainSigner, SigningServerCore } from "@iov/core";
import { EnglishMnemonic } from "@iov/crypto";
import { Ed25519HdWallet, HdPaths, UserProfile } from "@iov/keycontrol";

const port = 8822;

const mnemonic = new EnglishMnemonic(
  "tail clean cereal decorate twist drip stairs seminar appear sheriff castle excess",
);

async function main(): Promise<void> {
  const profile = new UserProfile();
  const wallet = profile.addWallet(Ed25519HdWallet.fromMnemonic(mnemonic.asString()));
  const signer = new MultiChainSigner(profile);

  const bnsConnection = (await signer.addChain(bnsConnector("wss://bns.hugnet.iov.one/"))).connection;
  const bcpConnection = (await signer.addChain(bnsConnector("wss://bov.hugnet.iov.one/"))).connection;

  // Create 3 identities per blockchain
  await profile.createIdentity(wallet.id, bnsConnection.chainId(), HdPaths.iov(0));
  await profile.createIdentity(wallet.id, bnsConnection.chainId(), HdPaths.iov(1));
  await profile.createIdentity(wallet.id, bnsConnection.chainId(), HdPaths.iov(2));
  await profile.createIdentity(wallet.id, bcpConnection.chainId(), HdPaths.iov(0));
  await profile.createIdentity(wallet.id, bcpConnection.chainId(), HdPaths.iov(1));
  await profile.createIdentity(wallet.id, bcpConnection.chainId(), HdPaths.iov(2));

  for (const identity of profile.getIdentities(wallet.id)) {
    const address = await signer.identityToAddress(identity);
    const account = await signer.connection(identity.chainId).getAccount({ address: address });
    console.log(`${address}:`, account ? account.balance : "does not exist");
  }

  const core = new SigningServerCore(profile, signer);
  const server = new JsonRpcSigningServer(core);

  const api = new Koa();
  api.use(bodyParser());

  api.use(async context => {
    switch (context.path) {
      case "/":
        const requestBody = (context.request as any).body;
        console.log(requestBody);
        const response = await server.handleUnchecked(requestBody);
        // tslint:disable-next-line:no-object-mutation
        context.response.body = response;
        break;
      default:
      // koa sends 404 by default
    }
  });

  console.log(`Starting webserver on port ${port} ...`);
  api.listen(port);
}

main().catch(error => {
  console.error(error.toString());
  process.exit(1);
});
