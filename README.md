## Get started

- `yarn build`
- `node build/index.js`

Now use a HTTP client to request bcpd identities:

```
$ curl -sS -X POST -d '{"jsonrpc":"2.0", "id": 1, "method": "getIdentities", "params": { "reason": "Who are you?", "chainIds": ["bov-hugnet"]}}' -H "Content-Type: application/json" http://localhost:8822/ | jq
```

Or send a signing request

```
curl -sS -X POST -d '{"jsonrpc":"2.0", "id": 1, "method": "signAndPost", "params": { "reason": "Please pay your bill no. 25353", "transaction": { "kind": "bcp/send", "creator": { "chainId": "bov-hugnet", "pubkey": { "algo": "ed25519", "data": "... we cannot encode Uint8Array at the moment" } }}}}' -H "Content-Type: application/json" http://localhost:8822/ | jq
```
