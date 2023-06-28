# Appwrite Funcover

> Right before Appwrite's [releasing](https://github.com/appwrite/appwrite/discussions/5016) next gen (4) of their functions, You can cover your Appwrite function with a dedicated endpoint!

With Funcover you can `cover` your function with any domain you want. That means that you'll be able to access one of your [Appwrite functions](https://appwrite.io/docs/functions)  or all of them using any endpoint you want.

This feature will help you use Appwrite functions as a target-webhook, direct access URL (without the need to provide project id), And also simply, for your convince.

## Funcover is built with:

- [Bun](https://bun.sh/) _(Because I like it)_ - A fast all-in-one JavaScript runtime.
- [Hono](https://hono.dev/) - Simple, ultrafast web framework.
- TypeScript - I'm speechless :wink:

## Funcover features

- [x] Access your Appwrite function through a GET request.
- [x] User your Appwrite function as a Webhook.
- [x] Passing all request headers.
- [x] Passing all request Body/Form/Json data.
- [x] Passing `data` query variable in GET requests.
- [x] Can be used for single or all of your functions.
- [x] Passing API Key.
- [x] Access Funcover on custom path.

## Installation

Funcover meant to be added to your current [self-hosted](https://appwrite.io/docs/self-hosting) Appwrite instance.

#### SSL

_If you're going to use Funcover on a custom path **without**_ custom domain, If so you can skip this part.

Before adding Funcover you'll need make sure that the domain you're planning to use will have SSL, To do so we're harnessing Appwrite [custom-domain](https://appwrite.io/docs/custom-domains) feature.

After adding your domain as custom-domain to any of your Appwrite project, and, the domain is now pointing to your Appwrite instance you can move to the next step.

#### Adding Funcover.

SSH into your server and edit your `docker-compose.yml` file.

At the bottom of the file right after the `telegraf` service, and, right before the `networks` section add the following.

```yaml
  funcover:
    image: boolcode/appwrite-funcover:0.0.6
    container_name: funcover
    restart: unless-stopped
    environment:
      - ALLOW_GLOBAL=true
      - DEFAULT_PROJECT=yourDefaultProjectID
      - DEFAULT_FUNCTION=yourDefaultFunctionID
    networks:
      - appwrite
      - gateway
    labels:
      - traefik.enable=true
      - traefik.constraint-label-stack=appwrite
      - traefik.docker.network=appwrite
      - traefik.http.services.funcover.loadbalancer.server.port=3000
      - traefik.http.routers.funcover-http.entrypoints=appwrite_web
      - traefik.http.routers.funcover-http.rule=Host(`custom.domain.com`) && PathPrefix(`/`)
      - traefik.http.routers.funcover-http.service=funcover
      - traefik.http.routers.funcover-https.entrypoints=appwrite_websecure
      - traefik.http.routers.funcover-https.rule=Host(`custom.domain.com`) && PathPrefix(`/`)
      - traefik.http.routers.funcover-https.service=funcover
      - traefik.http.routers.funcover-https.tls=true
```

Replace `custom.domain.com` with your newly attached custom-domain.

Look [here](docker-compose.yml) for a complete example.

<details>
<summary>What is going on that snippet, what we just did??</summary>

We have added a new service into the docker-compose.yml file, And, Here's a quick overview of the fields.

- `image` - The name of the Docker image we are using for this service.
- `container_name` - The name of the container. useful for logging and monitoring.
- `restart` - Container restart policy. We have set it to `unless-stopped`, So, unless we're stopping it Docker will make sure the service is on.
- `environment` - Here we're passing some values to be handled by Funcover at runtime. This is the best way to customize docker images without the need to rebuild them.
- `networks` - Here we're connecting Funcover to `appwrite` network.
- `labels` - Labels are piece of information that can be used by other containers,In this case the `traefik` one.

Do notice the service rule (for http & https)

```
.rule=Host(`custom.domain.com`) && PathPrefix(`/`)
```

We are setting two conditions for the rule.

1. **Host** - We want to match the host to access Funcover.
2. **PathPrefix** - Adding this part is important for the case we want Funcover to be able to parse all requests with no routes.

_**Be aware** that when you're upgrading Appwrite this addition will be erased._
</details>
<hr> 

In these two rows we just add we are forwarding our requests using a **domain**:

```yaml
      - traefik.http.routers.funcover-https.rule=Host(`custom.domain.com`) && PathPrefix(`/`)
      - traefik.http.routers.funcover-https.rule=Host(`custom.domain.com`) && PathPrefix(`/`)
```

From Funcover version `0.0.6` you can also forward the requests using a custom path. like so:

```yaml
  funcover:
    image: boolcode/appwrite-funcover:0.0.6
    container_name: funcover
    restart: unless-stopped
    environment:
      - ALLOW_GLOBAL=true
      - PATH_INSTEAD_OF_DOMAIN=true
      - PATH_PREFIX=v1/webhook
      - DEFAULT_PROJECT=yourDefaultProjectID
      - DEFAULT_FUNCTION=yourDefaultFunctionID
    networks:
      - appwrite
      - gateway
    labels:
      - ...
      - traefik.http.routers.funcover-https.rule=PathPrefix(`/v1/webhook`)
      - ...
      - traefik.http.routers.funcover-https.rule=PathPrefix(`/v1/webhook`)
```

Keep in mind that you'll need to add `PATH_INSTEAD_OF_DOMAIN` and `PATH_PREFIX` environment variables. check more [here](#environment-variables).

Now it's time to reload our Docker Compose environment by running,

```shell
docker compose up -d
```

### Usages

Now any time you'll access the custom-domain, your default function in your default project will run, And, Will return back the execution JSON. Just like you've used the [createExecution](https://appwrite.io/docs/client/functions?sdk=web-default#functionsCreateExecution) function.

```json
{
  "$id"         : "5e5ea5c16897e",
  "$createdAt"  : "2020-10-15T06:38:00.000+00:00",
  "$updatedAt"  : "2020-10-15T06:38:00.000+00:00",
  "$permissions": [
    "any"
  ],
  "functionId"  : "5e5ea6g16897e",
  "trigger"     : "http",
  "status"      : "processing",
  "statusCode"  : 0,
  "response"    : "",
  "stdout"      : "",
  "stderr"      : "",
  "duration"    : 0.4
}
```

For different return formats check the `RETURN_TYPE` variable [here](#environment-variables).

Passing data to the function can be done in any of the following four ways.

1. GET `data` variable. `https://custom.domain.com/?data=data`
2. GET parameter route as data. `https://custom.domain.com/data`
3. POST using raw data with `application/json` content type.
4. POST using form-data.
5. POST using application/x-www-form-urlencoded.

#### Note for POST

Funcover will check first for raw JSON data before checking for `form-data` or `application/x-www-form-urlencoded`.

Also, You can use a filed named `rawData` to pass data directly to `data` key. Here's an example in JSON

```json
{
  "rawData": "I'm piece of data"
}
```

This data will be sent to the function like so:

```json
{
  "data": "I'm piece of data"
}
```

As in any other case, this one for example:

```json
{
  "data": "I'm piece of data"
}
```

The data will be sent to the function completely, like so:

```json
{
  "data": "{\"data\":\"I'm piece of data\"}"
}
```

#### Logs

Funcover don't produce any logs at runtime. In case you want to debug Funcover steps, or you just want to know more, You can pass the `VERBOSE` environment variable in the `docker-compose.yml` file.

Then you'll be able to see the logs by running

```shell
docker logs funcover
```

You can add the `-f` flag to follow the log output.

#### Global

Funcover can be used for a single function by setting the `DEFAULT_PROJECT` & `DEFAULT_FUNCTION` variables.

Also, Funcover can be used to handle all of your functions by project and function ID.

To do so you'll need to set the `ALLOW_GLOBAL` variable as `true` and reload your Docker Compose environment.

Now you'll be able to access any of your functions by using the following route.

```
https://custom.domain.com/projectId/functionId/
```

Also, here, You pass the data in GET or POST as in the default function endpoint.

#### Multiple instances.

In case you like to use Funcover on single mode, and/or you want to have multiple Funcover instances you can do so.

In the attached [example](docker-compose.yml) you can see how to set a second Funcover by looking on the `funcover-second` service.

#### Rate limiting & Permissions

As of now Funcover uses the [REST](https://appwrite.io/docs/rest) [Client-side](https://appwrite.io/docs/sdks#client) SDK. That mean that each function will hit their client rate-limit after 60 execution in a given minute.

For most use-cases that will more than enough.

Also, because Funcover execute the function through Client-side, Make sure you're adding the `Any` execution permission for your function permissions.

If you want your function to run as many times as you like you can add project API key with the `API_KEYS` environment variable.

### Environment variables

_You can take a look at [.env.example](.env.example) for possible values_

#### `VERBOSE`

When sets to `true` Funcover will produce more logs at runtime.

#### `ALLOW_GLOBAL`

When sets to `true` Funcover will handle all of your function by project id.

#### `API_KEYS`

In case you need your function to be able run as many times as necessary, You can pass here an Appwrite API key that will be used when executing the function.

The format of this variable is like so:

```
API_KEYS=someProjectId:someProjectKey,anotherProjectId:anotherProjectKey
```

First add the project ID, then the full API key seperated with the `:` colons character.

Then, if you want to another API key for another project, you can do so by separating these project keys with a `,` comma.

#### `FLATTEN_HEADERS`

When sets to `true` Funcover will insert all of the request headers as `headers` property inside your function payload.

Like so:

```json
{
  "data": {
    "data"   : {},
    "headers": {}
  }
}
```

Notice your `data` will be sent recursively inside `data.data` property, and you'll to extract the data like so:

```javascript
    // First, Get the payload.
const payload = JSON.parse(req.payload);

// Second, parse the data and the headers.
const data    = JSON.parse(payload.data);
const headers = JSON.parse(payload.headers);
```

#### `RETURN_TYPE`

How would you like to get the function output back

- `normal` - (Default) Just return the function output as JSON.
- `json` - Returns the `response` part from the function as parsed JSON.
- `html` - Returns the `response` part from the function as parsed HTML.
- `redirect` - Redirect the user the `response` returned URL.

#### `PATH_AS_DATA`

When sets to `true` Funcover will pass the following parameter as the function data.

That means, you don't need to use the `data` variable like this

```
https://custom.domain.com/?data=data
```

You can just send it as the following route like so:

```
https://custom.domain.com/data
```

This will also work with the `ALLOW_GLOBAL` variable, so you can use it like this:

```
https://custom.domain.com/projectId/functionId/data
```

#### `ENDPOINT`

Set as your Appwrite endpoint.

Funcover will work even if you didn't provide any endpoint, As Funcover will access the main Appwrite container through Docker-network internal host url, `http://appwrite/v1`.

#### `DEFAULT_PROJECT`

Set as your default Appwrite project ID.

#### `DEFAULT_FUNCTION`

Set as your default Appwrite function ID.

#### `PATH_INSTEAD_OF_DOMAIN`

When sets to `true` Funcover will add the value of `PATH_PREFIX` to all is routes.

For example, when `PATH_PREFIX` is sets = `v1/webhook` then Funcover will deliver the default function in `https://domain.com/v1/webhook` instead of `https://domain.com/`.

All other option - like `ALLOW_GLOBAL` for example - are available to use when using this option.

#### `PATH_PREFIX`

Set the path to will be add as prefix to **all** Funcover requests.
