## Get started

- `yarn build`
- `node build/index.js`

Now use a HTTP client to request bcpd identities:

```
$ curl -sS -X POST -d '{"jsonrpc":"2.0", "id": 1, "method": "getIdentities", "params": { "reason": "Who are you?", "chainIds": ["bov-hugnet"]}}' -H "Content-Type: application/json" http://localhost:8822/ | jq
```
