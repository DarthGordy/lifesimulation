// html canvas setup
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
canvas.width = 600;
canvas.height = 900;
// add the "Stop Now" button to the canvas
let btn = document.createElement("button");
btn.innerHTML = "Stop Now";
btn.style.position = "absolute";
btn.style.top = "20px";
btn.style.left = "250px";
btn.addEventListener("click", function () {
    stopNow = true;
});
document.body.appendChild(btn);

// visualisation parameters

const bounds = { x: 10, y: 50, width: 300, height: 300 }; // test pen
const rowMargin = bounds.height + 30; // net drawing
const margin = 80; // net drawing
const rowGap = 50; // net drawing
const colGap = 150; // net drawing
const nodeSize = 15; // net drawing

// simulation parameters

const doLogBestAction=false; // for debug only - use on very small population e.g. 1 or 2
const killPoints = 50; // how much a kill is worth
const maxDistance = 500; // used to calculate score = maxDistance - distance from food
const maxCycles = 300; // length of a creature's lifetime
const maxCreatures = 300; // max number of creatures
const maxGenerations = 2000; // run for number of generations
const maxMutations = 0.2; // % mutation where 1 = 100%. Ideal is around 16% to 20%
const doLoadFromModel = false; // if set to true then use the neuralNetModel array to create population
const doRepopulateFromFirstGen = true; // use if repopulating from the model rather than randomly
const doNaturalSelection = true; // perform natural selection
const doReproduction = true; // set to true to turn on repopulation for each generation
const doGeneticMutation = true; // perform genetic mutation
const doExportModel = true; // export the model when the generations end or kill count = numRequiredToKill
const numRequiredToKill = 295; // Stop the simulation when this number of creatures made a kill
const numNeuralNetsToExport = 50; // top x number of neuralNets to export

// mutable variables

let stopNow = false; // when button pressed or numRequiredToKill target reached
let cycle = 0; // current cycle
let gen = 0; // current generation
let foodx = 0; // initialisation of food pos
let foody = 0; // initialisation of food pos

let actLog = ""; // used for debug output when doLogBestAction is true

// NeuralNet Draw functions (used when simulation ends to draw "best" neuralNet)

function drawNode(type, node, x, y) {
    node.x = x;
    node.y = y;
    ctx.fillStyle = 'lightgray';
    ctx.beginPath();
    ctx.arc(x, y, nodeSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = "center";
    if (type === 0) { // stimuli
        ctx.textAlign = "center";
        ctx.font = "12px serif";
        ctx.fillStyle = 'black';
        ctx.fillText(node.stimuliType, x, y + 5);
        ctx.font = "10px serif";
        ctx.fillStyle = 'white';
        ctx.fillText(node.output, x - 30, y + 5);
    } else if (type === 1) { // action
        ctx.textAlign = "center";
        ctx.font = "12px serif";
        ctx.fillStyle = 'black';
        ctx.fillText(node.actionType, x, y + 5);
        ctx.textAlign = "left";
        ctx.font = "10px serif";
        ctx.fillStyle = 'white';
        let txt = roundFloat(node.output) + ' (bias: ' + roundFloat(node.bias) + ')';
        ctx.fillText(txt, x + 30, y + 5);
    } else { // inner neuron
        ctx.textAlign = "center";
        ctx.font = "12px serif";
        ctx.fillStyle = 'black';
        ctx.fillText('N' + node.index, x, y + 5);
        ctx.textAlign = "left";
        ctx.font = "10px serif";
        ctx.fillStyle = 'white';
        let txt = roundFloat(node.output) + ' (bias: ' + roundFloat(node.bias) + ')';
        ctx.fillText(txt, x + 15, y - 15);
    }
}

function drawArrowLine(fx, fy, tx, ty) {
    let headlen = 10; // length of head in pixels
    let dx = tx - fx;
    let dy = ty - fy;
    let angle = Math.atan2(dy, dx);
    ctx.moveTo(fx, fy);
    ctx.lineTo(tx, ty);
    ctx.lineTo(tx - headlen * Math.cos(angle - Math.PI / 6), ty - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - headlen * Math.cos(angle + Math.PI / 6), ty - headlen * Math.sin(angle + Math.PI / 6));
}

function drawNeuralNet(neuralNet) {
    let rowS = rowMargin;
    let rowN = rowMargin + 30;
    let rowA = rowMargin;
    let colS = margin;
    let colN = margin + nodeSize + colGap;
    let colA = margin + nodeSize + colGap + nodeSize + colGap;
    for (n = 0; n < neuralNet.genome.length; n++) {
        ctx.beginPath();
        let gene = neuralNet.genome[n];
        if (gene.sourceType === 0) { // stimuli
            if (gene.source.x === undefined) {
                drawNode(0, gene.source, colS, rowS + rowGap);
                rowS += rowGap;
            }
        } else { // must be a neuron
            if (gene.source.x === undefined) {
                drawNode(2, gene.source, colN, rowN + rowGap);
                rowN += rowGap;
            }
        }
        if (gene.targetType === 1) { // action
            if (gene.target.x === undefined) {
                drawNode(1, gene.target, colA, rowA + rowGap);
                rowA += rowGap;
            }
        } else { // must be a neuron
            if (gene.target.x === undefined) {
                drawNode(2, gene.target, colN, rowN + rowGap);
                rowN += rowGap;
            }
        }
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'green';
        drawArrowLine(gene.source.x + nodeSize, gene.source.y, gene.target.x - nodeSize, gene.target.y);
        ctx.stroke();
        let midx = (gene.source.x + gene.target.x) / 2;
        let midy = (gene.source.y + gene.target.y) / 2;
        midx = (gene.source.x + midx) / 2;
        midy = (gene.source.y + midy) / 2;
        ctx.textAlign = "left";
        ctx.font = "10px serif";
        ctx.fillStyle = 'white';
        ctx.fillText(roundFloat(gene.weight), midx, midy);
    }
}

// Draw functions for test pen, food and creatures

function drawCreature(creature) {
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(creature.pos.x, creature.pos.y, 1, 1);
}

function drawFood() {
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(foodx, foody, 1, 1);
}

function drawTestPen() {
    ctx.font = "20px serif";
    ctx.fillStyle = "white";
    ctx.fillText("AI Test", 10, 20);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "white";
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    ctx.strokeRect(bounds.x - 1, bounds.y - 1, bounds.width + 1, bounds.height + 1);
    ctx.lineWidth = 1;
    ctx.strokeRect(bounds.x + 100, bounds.y + 20, 1, 80);
    ctx.strokeRect(bounds.x + 200, bounds.y + 20, 1, 80);
    ctx.strokeRect(bounds.x + 100, bounds.y + bounds.height - 100, 1, 80);
    ctx.strokeRect(bounds.x + 200, bounds.y + bounds.height - 100, 1, 80);
    ctx.strokeRect(bounds.x + 40, bounds.y + bounds.height - 150, 80, 1);
    ctx.strokeRect(bounds.x + bounds.width - 120, bounds.y + bounds.height - 150, 80, 1);
}

// Positions in the world

function generateCreaturePosition(creature) {
    spawnBlocked = true;
    while (spawnBlocked) {
        creature.pos.x = randomInt(bounds.x + 10, bounds.x + bounds.width - 10);
        creature.pos.y = randomInt(bounds.y + 10, bounds.y + bounds.height - 10);
        creature.lastBestPos = creature.pos;
        let p = ctx.getImageData(creature.pos.x, creature.pos.y, 1, 1).data;
        let colour = "#" + ("000000" + rgbToHex(p[0], p[1], p[2])).slice(-6);
        spawnBlocked = (colour != "#000000")
    }
}

function randomiseStartingPositions() {
    creatures.forEach((creature) => {
        generateCreaturePosition(creature);
    });
}

function generateFoodPosition() {
    spawnBlocked = true;
    while (spawnBlocked) {
        foodx = randomInt(bounds.x + 10, bounds.x + bounds.width - 10);
        foody = randomInt(bounds.y + 10, bounds.y + bounds.height - 10);
        let p = ctx.getImageData(foodx, foody, 1, 1).data;
        let colour = "#" + ("000000" + rgbToHex(p[0], p[1], p[2])).slice(-6);
        spawnBlocked = (colour != "#000000")
    }
}

// Scoring and Measurement
function calculateScores() {
    let numKilled = 0;
    creatures.forEach((creature) => {
        if (creature.hasKilled) numKilled++;
        creature.hasKilled = false;
        creature.neuralNet.score += maxDistance - lineDistance(creature.pos, { x: foodx, y: foody });
    });
    console.log(numKilled + ' made a kill this generation')
    if (numKilled>=numRequiredToKill)
        stopNow=true;
}

function resetScores() {
    creatures.forEach((creature) => {
        creature.neuralNet.score = 0;
    });
}

function makeArrayofScores() {
    let scores = [];
    creatures.forEach((cr) => {
        scores.push(cr.neuralNet.score);
    });
    return scores;
}

function averageScore() {
    return Math.floor(averageArrayValues(makeArrayofScores()));
}

function minScore() {
    return Math.floor(Math.min(...makeArrayofScores()));
}

function maxScore() {
    return Math.floor(Math.max(...makeArrayofScores()));
}

function findBestCreature() {
    let bestCreature;
    let bestScore = Math.floor(maxScore());
    creatures.forEach((creature) => {
        if (Math.floor(creature.neuralNet.score) === bestScore)
            bestCreature = creature;
    });
    return bestCreature;
}

function topXPercent(x) {
    let bestNeuralNets = [];
    let bestScore = Math.floor(maxScore());
    let percent = 100 - x; // e.g. top 5% would be 95% or over
    let topXPercentOfScore = bestScore * (percent / 100);
    creatures.forEach((creature) => {
        if (creature.neuralNet.score >= topXPercentOfScore) {
            bestNeuralNets.push(creature.neuralNet);
        }
    });
    return bestNeuralNets;
}

function getTopNeuralNets(x) {
    return creatures.slice().sort((a, b) => {
        return b.neuralNet.score - a.neuralNet.score;
    }).slice(0, x);
}

function topXPercentScore(x) {
    let bestScore = Math.floor(maxScore());
    let percent = 100 - x; // e.g. top 5% would be 95% or over
    return bestScore * (percent / 100);
}

// Simulation functions
function creatureHeartbeat() {
    for (nb = 0; nb < creatures.length; nb++) {
        if (!creatures[nb].hasKilled) {
            creatures[nb].fire();
            drawCreature(creatures[nb]);
            doBestAction(creatures[nb]);
        }
    }
}

// Simulation execution
function setup() {
    console.log(new Date());
    console.log('Load from model: ' + doLoadFromModel);
    console.log('Repopulate from model: ' + doRepopulateFromFirstGen);
    console.log('Natural selection: ' + doNaturalSelection);
    console.log('Reproduce: ' + doReproduction);
    console.log('Mutations: ' + doGeneticMutation)
    console.log('Export Model: ' + doExportModel);
    console.log('Run for generations: ' + maxGenerations);
    if (!doLoadFromModel) {
        for (nb = 0; nb < maxCreatures; nb++) {
            let creature = new Creature();
            creature.neuralNet = generateRandomNeuralNet();
            generateCreaturePosition(creature);
            creatures.push(creature);
        }
    } else {
        loadNeuralNetModel();
        if (doRepopulateFromFirstGen) {
            // reproduce - repopulation
            reproduction();
            // generate new positions
            randomiseStartingPositions();
        }
        if (doGeneticMutation) {
            // genetic mutation
            geneticMutation();
        }
    }
    generateFoodPosition();
}

function runLifecycle() {
    ctx.beginPath();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTestPen();
    drawFood();
    creatureHeartbeat();
    ctx.stroke();
    if (cycle < maxCycles) {
        cycle++;
        requestAnimationFrame(runLifecycle);
    } else { // next gen
        calculateScores();
        let avgScore = averageScore();
        console.log('gen ' + gen + ' min:' + minScore() + ' avg:' + avgScore + ' max:' + maxScore() + ' count:' + creatures.length);
        gen++;
        if (gen < maxGenerations &&
            !stopNow) {
            if (doNaturalSelection) {
                // natural selection
                let targetScore = averageScore(); // or topXPercentScore(75);
                naturalSelection(targetScore);
            }
            // score reset 
            resetScores();
            if (doReproduction) {
                // reproduce - repopulation
                reproduction();
            }
            // generate new positions
            randomiseStartingPositions();
            if (doGeneticMutation) {
                // genetic mutation
                geneticMutation();
            }
            if (doNaturalSelection ||
                doGeneticMutation)
                pruneGenes();
            // regenerate food co-ords
            generateFoodPosition();
            // start next generation
            cycle = 0;
            requestAnimationFrame(runLifecycle);
        } else { // end of gens
            // stop the clock
            console.log(new Date());
            if (doExportModel) {
                let topNeuralNets = getTopNeuralNets(numNeuralNetsToExport);
                exportNeuralNets(topNeuralNets);
            }
            let creature = findBestCreature();
            drawNeuralNet(creature.neuralNet);
        }
    }

}

// start simulation
setup();
runLifecycle();