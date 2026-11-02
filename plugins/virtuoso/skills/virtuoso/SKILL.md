---
name: virtuoso
description: Query and manage a Virtuoso RDF triple store. Run SPARQL via isql or the HTTP endpoint, load RDF data, and debug connectivity, with Docker containers or Kubernetes pods. Use when the user mentions Virtuoso, SPARQL, named graphs, triples, or loading RDF.
---

# Virtuoso: query and management

## Rules for large repositories

**Never use `COUNT(*)`, `COUNT(DISTINCT ...)`, or `GROUP BY ... COUNT` over `?s ?p ?o` or whole graphs unless the user explicitly asks.** On big stores they scan everything, can run for minutes, and load the server.

Instead:
- **Does data exist?** `ASK { ?s ?p ?o }` or `ASK { GRAPH <g> { ?s ?p ?o } }`
- **What does it look like?** `SELECT ... LIMIT 10`
- **Which graphs?** `SELECT DISTINCT ?g WHERE { GRAPH ?g { ?s ?p ?o } } LIMIT 50` (no counts)
- **Which types or predicates?** Restrict to one graph and add `LIMIT`, or sample with a subquery: `SELECT DISTINCT ?type WHERE { { SELECT ?s WHERE { ?s a ?x } LIMIT 10000 } ?s a ?type } LIMIT 50`
- **Size estimate needed?** Ask the user first. If they agree, scope it to one small graph or one type, or use a cheap approach: `LIMIT`-bounded probes, or Conductor / graph stats.
- Always add `LIMIT`. Prefer `FROM <graph>` to scope queries.

## Connection setup

Pick the environment, then use the matching command prefix below.

| Environment | How to reach Virtuoso |
|---|---|
| Docker | `docker ps \| grep virtuoso` to find the container; password is `DBA_PASSWORD` in the project `.env` |
| Kubernetes | `kubectl get pods -A \| grep -i virtuoso` to find pod and namespace; password is in the pod env or a Secret |

Kubernetes helpers:
```bash
NS=<namespace>; POD=<pod>
# Password from the pod env (if set there):
kubectl -n $NS exec $POD -- printenv DBA_PASSWORD
# Or from a Secret:
kubectl -n $NS get secret <secret> -o jsonpath='{.data.DBA_PASSWORD}' | base64 -d
# Multiple containers in the pod: add -c <container>
```

## Method A: isql (inside the container or pod)

Docker:
```bash
docker exec virtuoso bash -c 'isql 1111 dba $DBA_PASSWORD exec="sparql ASK { ?s ?p ?o };"'
```

Kubernetes:
```bash
kubectl -n $NS exec $POD -- bash -c 'isql 1111 dba $DBA_PASSWORD exec="sparql SELECT * WHERE { ?s ?p ?o } LIMIT 10;"'
```

Multi-line queries: pipe via heredoc with `-i` (`docker exec -i` / `kubectl exec -i`), one `sparql ...;` statement per query.

If `$DBA_PASSWORD` is not in the environment, pass the password literally (do not echo it back to the user).

## Method B: HTTP SPARQL endpoint (port 8890)

| From | URL |
|---|---|
| Host, Docker | `http://localhost:8890/sparql` |
| Another container, Docker network | `http://virtuoso:8890/sparql` |
| Host, Kubernetes | `kubectl -n $NS port-forward pod/$POD 8890:8890` (or `svc/<service>`), then `http://localhost:8890/sparql` |
| Another pod | `http://<service>.<namespace>.svc.cluster.local:8890/sparql` |

`localhost` inside another container or pod is that container itself, not Virtuoso.

```bash
curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/sparql-query" \
  -H "Accept: application/sparql-results+json" \
  -d "SELECT * WHERE { ?s ?p ?o } LIMIT 10"
```

From inside a container or pod without curl:
```bash
docker  exec <app> wget -q -O - --post-data="$Q" --header="Content-Type:application/sparql-query" http://virtuoso:8890/sparql
kubectl -n $NS exec <app-pod> -- wget -q -O - --post-data="$Q" --header="Content-Type:application/sparql-query" http://<service>:8890/sparql
```

Content types: raw SPARQL uses `application/sparql-query`; form posts use `application/x-www-form-urlencoded` with `query=...`. Output format: `&format=json|xml|csv`.

Graph scoping: `SELECT * FROM <http://my-graph/> WHERE { ?s ?p ?o } LIMIT 10`.

## Loading RDF data

### Bulk load via isql

1. Put the file in a directory Virtuoso can read (listed in `DirsAllowed` in `virtuoso.ini`). Docker: the host side of the volume mount in compose. Kubernetes: copy it in with `kubectl cp <file> $NS/$POD:<dir>/` (or use a mounted PVC).
2. Register, load, check:
```bash
EXEC="docker exec -i virtuoso"            # or: kubectl -n $NS exec -i $POD --
$EXEC bash -c 'isql 1111 dba $DBA_PASSWORD' <<'SQL'
ld_dir('<dir>', '*.ttl', 'http://my-graph/');
rdf_loader_run();
select ll_file, ll_state, ll_error from DB.DBA.load_list where ll_file like '%<name>%';
SQL
```
`ll_state = 2` means loaded; a non-null `ll_error` means failed. Verify with `SELECT * FROM <http://my-graph/> WHERE { ?s ?p ?o } LIMIT 10` (no count).

Formats: Turtle, N-Triples, TriG, RDF/XML.

### Via HTTP Graph Store Protocol

```bash
curl -X POST "http://localhost:8890/sparql-graph-crud-auth?graph-uri=http://my-graph/" \
  --digest -u dba:$DBA_PASSWORD \
  -H "Content-Type: text/turtle" --data-binary @data.ttl
```
Use the `-auth` endpoint for writes. For Kubernetes, port-forward first.

## Conductor (web UI)

`http://localhost:8890/conductor` (on Kubernetes, port-forward first). Login `dba` plus the DBA password. Useful for running SPARQL, managing graphs, and uploading RDF.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Connection refused from another container/pod | Don't use `localhost`; use the service or container name |
| `kubectl exec` can't find `isql` | Wrong container; use `-c <container>`, or `which isql` / look in `/opt/virtuoso-opensource/bin` |
| Port-forward drops | Rerun it; it ends when the pod restarts |
| Query returns nothing | `ASK { ?s ?p ?o }`, then list graphs with `LIMIT`; check graph IRI and trailing slash |
| 400 Bad Request | Wrong `Content-Type` for the body format |
| Timeout or very slow | Add `LIMIT`, scope with `FROM <graph>`, remove counts, or raise `MaxQueryExecutionTime` in `virtuoso.ini` |
| Load stays queued | Directory not in `DirsAllowed`, or `rdf_loader_run()` not called |

IRI prefixes must match exactly, including trailing slashes.
