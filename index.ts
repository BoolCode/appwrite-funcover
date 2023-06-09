import {Hono} from "hono";
import {runFunction} from "./inc/lib";

const app = new Hono()

if (process.env.ALLOW_GLOBAL === 'true') {
    // Project and function route
    app.all('/:project/:functionId', async (c) => {
        return await runFunction(c.req.param().project, c.req.param().functionId, c);
    });
}

// Default function
app.all('/', async (c) => {
    return await runFunction(process.env.DEFAULT_PROJECT ?? '', process.env.DEFAULT_FUNCTION ?? '', c);
});

// Error 404
app.all('*', (c) => {
    return c.json({'NotFound': true}, 404);
});

Bun.serve({
    port : 3000,
    fetch: app.fetch,
});