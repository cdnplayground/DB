const WebSocket = require('ws');
const crypto = require('crypto');
const fs = require('fs');

const server = new WebSocket.Server({ port: 8080 });
const key = process.env.NETDEV_DB_KEY;

function encrypt(text) {
    var cipher = crypto.createCipher('aes-256-ctr', key);
    var crypted = cipher.update(text, 'utf8', 'hex');
    crypted += cipher.final('hex');
    return crypted;
}

function decrypt(text) {
    var decipher = crypto.createDecipher('aes-256-ctr', key);
    var dec = decipher.update(text, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
}

const data = JSON.parse(decrypt(fs.readFileSync('db.nddb').toString() || encrypt('[]')));

server.on('connection', function (ws) {
    ws.on('message', function (message) {
        try {
            const json = JSON.parse(message);
            if (json.set) {
                data.push(json.set);
                fs.writeFileSync('db.nddb', encrypt(JSON.stringify(data)));
                ws.send(JSON.stringify({ ok: true }));
            } else if (json.query) {
                let out = [];
                data.forEach(function (item) {
                    var found = true;
                    for (let key in json.query) {
                        if (json.query[key] != item[key]) {
                            found = false;
                        }
                    }
                    if (found) {
                        out.push(item)
                    }
                });
                ws.send(JSON.stringify({ ok: true, data: out }));
            }
        } catch {
            ws.send(JSON.stringify({
                ok: false,
                data: 'Bad JSON',
            }));
        }
    });
});
