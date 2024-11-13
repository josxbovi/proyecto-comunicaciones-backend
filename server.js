const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 5000;

app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.send('Servidor backend funcionando correctamente');
});

app.post('/encode', (req, res) => {
    const { data } = req.body;
    const { encodedData, steps, parityTable, hammingDistance } = encodeHamming(data);
    res.json({ encodedData, steps, parityTable, hammingDistance });
});

app.post('/decode', (req, res) => {
    const { data } = req.body;
    const { decodedData, steps, parityTable, error, errorDetails } = decodeHamming(data);
    res.json({ decodedData, steps, parityTable, error, errorDetails });
});

function calculateHammingDistance(str1, str2) {
    if (str1.length !== str2.length) {
        return null;
    }
    
    let distance = 0;
    for (let i = 0; i < str1.length; i++) {
        if (str1[i] !== str2[i]) {
            distance++;
        }
    }
    return distance;
}

function encodeHamming(data) {
    const dataBits = data.split('').map(bit => parseInt(bit));
    const m = dataBits.length;
    let r = 1;
    let steps = [`Datos de entrada: ${data}`];
    let parityTable = [];

    while (Math.pow(2, r) < m + r + 1) {
        r++;
    }
    steps.push(`Bits necesarios para la paridad: ${r}`);

    const encodedBits = [];
    let j = 0;
    for (let i = 1; i <= m + r; i++) {
        if (Math.log2(i) % 1 === 0) {
            encodedBits[i - 1] = 0;
            steps.push(`Posición ${i} establecida como bit de paridad`);
        } else {
            encodedBits[i - 1] = dataBits[j];
            j++;
        }
    }

    for (let i = 0; i < r; i++) {
        const parityPos = Math.pow(2, i);
        const affectedBits = getAffectedBits(encodedBits, parityPos);
        const parityValue = calculateParity(encodedBits, parityPos);
        encodedBits[parityPos - 1] = parityValue;
        steps.push(`Calcular la paridad en la posición ${parityPos}: ${parityValue}`);

        parityTable.push({
            parityPos: parityPos,
            affectedBits: affectedBits.join(', '),
            parityValue: parityValue
        });
    }

    const minDistance = Math.floor(Math.log2(data.length)) + 1;
    steps.push(`Distancia mínima de Hamming para este código: ${minDistance}`);
    steps.push(`Este código puede detectar ${minDistance - 1} errores y corregir ${Math.floor((minDistance - 1)/2)} errores`);

    return { 
        encodedData: encodedBits.join(''), 
        steps, 
        parityTable,
        hammingDistance: minDistance 
    };
}

function getAffectedBits(bits, pos) {
    let affectedBits = [];
    for (let i = pos; i <= bits.length; i++) {
        if (((i + 1) & pos) !== 0) {
            affectedBits.push(i);
        }
    }
    return affectedBits;
}

function calculateParity(bits, pos) {
    let parity = 0;
    for (let i = pos; i <= bits.length; i++) {
        if (((i + 1) & pos) !== 0) {
            parity ^= bits[i - 1];
        }
    }
    return parity;
}

function decodeHamming(data) {
    const dataBits = data.split('').map(bit => parseInt(bit));
    const m = dataBits.length;
    let errorPosition = 0;
    let steps = [`Datos recibidos: ${data}`];
    let parityTable = [];
    let originalData = [...dataBits];

    for (let i = 0; Math.pow(2, i) <= m; i++) {
        const parityPos = Math.pow(2, i);
        const parity = calculateParity(dataBits, parityPos);
        steps.push(`Paridad calculada para la posición ${parityPos}: ${parity}`);
        if (parity !== 0) {
            errorPosition += parityPos;
        }

        const affectedBits = getAffectedBits(dataBits, parityPos);
        parityTable.push({
            parityPos: parityPos,
            affectedBits: affectedBits.join(', '),
            parityValue: parity
        });
    }

    let correctedData = null;
    if (errorPosition !== 0) {
        if (errorPosition > m) {
            steps.push(`La posición de error ${errorPosition} está fuera de límites y no se puede corregir`);
            return { 
                decodedData: null, 
                steps, 
                parityTable, 
                error: true,
                errorDetails: {
                    position: errorPosition,
                    originalData: data,
                    correctedData: null
                }
            };
        }
        dataBits[errorPosition - 1] ^= 1;
        correctedData = dataBits.join('');
        steps.push(`Error detectado en la posición ${errorPosition}`);
        steps.push(`Dato original: ${data}`);
        steps.push(`Dato corregido: ${correctedData}`);
    } else {
        steps.push(`No se encontró ningún error en los datos`);
    }

    const decodedBits = [];
    for (let i = 1; i <= m; i++) {
        if (Math.log2(i) % 1 !== 0) {
            decodedBits.push(dataBits[i - 1]);
        }
    }

    return { 
        decodedData: decodedBits.join(''), 
        steps, 
        parityTable, 
        error: false,
        errorDetails: errorPosition !== 0 ? {
            position: errorPosition,
            originalData: data,
            correctedData: correctedData
        } : null
    };
}

app.listen(port, () => {
    console.log(`Servidor backend corriendo en http://localhost:${port}`);
});