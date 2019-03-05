import inquirer = require("inquirer");
import Koa from "koa";
import bodyParser from "koa-bodyparser";

import { Address, PublicIdentity, UnsignedTransaction } from "@iov/bcp";
import { bnsConnector } from "@iov/bns";
import {
  GetIdentitiesAuthorization,
  JsonRpcSigningServer,
  MultiChainSigner,
  SignAndPostAuthorization,
  SigningServerCore,
} from "@iov/core";
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

  const allIdentities = profile.getIdentities(wallet.id);

  for (const identity of allIdentities) {
    const address = await signer.identityToAddress(identity);
    const account = await signer.connection(identity.chainId).getAccount({ address: address });
    console.log(`${address}:`, account ? account.balance : "does not exist");
  }

  const getIdentitiesAuthorization: GetIdentitiesAuthorization = async (
    reason: string,
    matchingIdentities: ReadonlyArray<PublicIdentity>,
  ): Promise<ReadonlyArray<PublicIdentity>> => {
    const addresses = matchingIdentities.map(identity => signer.identityToAddress(identity));

    const answers: any = await inquirer.prompt([
      {
        name: "selectedIdentities",
        type: "checkbox",
        choices: addresses,
        default: addresses,
        message: `Select identities you want to reveal for '${reason}':`,
      },
    ]);
    const selectedAddresses: ReadonlyArray<Address> = answers.selectedIdentities;

    console.log("Thanks, your choice will be processed.");

    const selectedIdentities = matchingIdentities.filter(identity =>
      selectedAddresses.includes(signer.identityToAddress(identity)),
    );
    return selectedIdentities;
  };

  const signAndPostAuthorization: SignAndPostAuthorization = async (
    reason: string,
    transaction: UnsignedTransaction,
  ): Promise<boolean> => {
    console.log("Transaction to be signed:", transaction);

    const answers: any = await inquirer.prompt([
      {
        name: "signAndPostAuthorization",
        type: "confirm",
        message: `Do you want to sign and submit the above transaction because of '${reason}':`,
      },
    ]);

    const authorized: boolean = answers.signAndPostAuthorization;
    return authorized;
  };

  const core = new SigningServerCore(profile, signer, getIdentitiesAuthorization, signAndPostAuthorization);
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
