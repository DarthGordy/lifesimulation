// simple AI with neural network and genetic algorythm
// reference data
const stimuliMinVal = -1;
const stimuliMaxVal = 1;
const actionMinVal = -1;
const actionMaxVal = 1;
const minNeurons = 5;
const maxNeurons = 10;
const minGenes = 8;
const maxGenes = 15;
const minBias = -3;
const maxBias = 3;

const nodeType = [
    'S', // stimuli
    'A', // action
    'N'  // neuron
];

const stimuliType = [
    'DUM', // 0 constant - always on
    'MBU', // 1 move blocked up
    'MBD', // 2 move blocked down
    'MBL', // 3 move blocked left
    'MBR', // 4 move blocked right
    'TNR', // 5 target is within 1 tile
    'TDU', // 6 target detected up 
    'TDD', // 7 target detected down 
    'TDL', // 8 target detected left 
    'TDR', // 9 target detected right 
];

const actionType = [
    'IDL', // 0 do nothing
    'KIL', // 1 attempt kill
    'MVU', // 2 move up
    'MVD', // 3 move down
    'MVL', // 4 move left
    'MVR', // 5 move right
    'MV?'  // 6 move random
];

// Neurons

class Stimuli {
    stimuliType;
    output = 0;
    bias = 0;
}

class Action { // can have multiple inputs (each with a weight from the connection)
    inputs = [];
    weights = [];
    output = 0;
    actionType;
    bias = 0;

    constructor() {
        this.randomiseBias();
    }

    randomiseBias() {
        this.bias = Math.floor(Math.random() * (+maxBias - +minBias)) + minBias;
    }
}

class Neuron { // an Inner Neuron: can be connected to a number of inputs or outputs
    index;
    inputs = [];
    weights = [];
    output = 0;
    driven = false; // boolean; forced (output is 1) or not (and therefore based on sigmoid)
    bias = 0;

    constructor() {
        this.randomiseBias();
    }

    randomiseBias() {
        const min = -1;
        const max = 1;
        this.bias = Math.floor(Math.random() * (+max - +min)) + min;
    }
}

class Gene {  // each gene is one connection in a neural net
    sourceType; // 0 for stimuli and 1 for nueron
    sourceIndex;
    source; // the stimuli or neuron
    targetType; // 0 for neuron and 1 for action
    targetIndex;
    target; // the neuron or action
    weight; // the weight of connection (-1..1)
}

class NeuralNet {
    neuralNetUUID = "";
    parentUUID = "";
    genome = []; // a set of genes and mappings
    stimuli = [];
    neurons = []; // a set of neurons which can be mapped in genome
    actions = [];
    bestAction;
    score = 0;    // the fitness score

    constructor() {
        this.neuralNetUUID = UUIDGenerator();
    }

    cloneObject() {
        let clone = new NeuralNet();
        clone.parentUUID = this.neuralNetUUID;
        // create inner neurons
        for (n = 0; n < this.neurons.length; n++) {
            let neuron = new Neuron();
            neuron.index = n;
            neuron.bias = this.neurons[n].bias;
            clone.neurons.push(neuron);
        }
        // create stimuli
        for (n = 0; n < stimuliType.length; n++) {
            let stimuli = new Stimuli();
            stimuli.stimuliType = stimuliType[n];
            stimuli.bias = this.stimuli[n].bias;
            clone.stimuli.push(stimuli);
        }
        // create actions
        for (n = 0; n < actionType.length; n++) {
            let action = new Action();
            action.actionType = actionType[n];
            action.bias = this.actions[n].bias;
            clone.actions.push(action);
        }
        // copy genome
        for (e = 0; e < this.genome.length; e++) {
            let gene = new Gene();
            gene.weight = this.genome[e].weight;
            gene.sourceType = this.genome[e].sourceType;
            gene.sourceIndex = this.genome[e].sourceIndex;
            gene.targetType = this.genome[e].targetType;
            gene.targetIndex = this.genome[e].targetIndex;
            clone.genome.push(gene);
        }
        for (e = 0; e < clone.genome.length; e++) {
            if (clone.genome[e].sourceType == 0) { // stimuli
                clone.genome[e].source = clone.stimuli[clone.genome[e].sourceIndex];
            } else { // Inner Neruon
                clone.genome[e].source = clone.neurons[clone.genome[e].sourceIndex];
            }
            if (clone.genome[e].targetType == 0) { // Nueron
                clone.genome[e].target = clone.neurons[clone.genome[e].targetIndex];
            } else { // Action
                clone.genome[e].target = clone.actions[clone.genome[e].targetIndex];
            }
        }
        return clone;
    }

    activation(inputs, weights, bias) {
        let weightedSum = 0;
        inputs.forEach((value, index) => {
            weightedSum = value * weights[index];
        });
        weightedSum += bias;
        return sigmoid(weightedSum);
    }

    fire() {
        //console.log(this.neuralNet.stimuli);

        // ** Propagate inner neurons
        for (let n = 0; n < this.neurons.length; n++) {
            this.neurons[n].inputs = [];
            this.neurons[n].weights = [];
            for (let g = 0; g < this.genome.length; g++) {
                if (this.genome[g].targetType == 0 && // it's a neuron
                    this.genome[g].target === this.neurons[n]) {
                    // collect inputs from sources
                    this.neurons[n].inputs.push(this.genome[g].source.output);
                    // collect weights from genome/connections
                    this.neurons[n].weights.push(this.genome[g].weight);
                }
            }
        }
        // perform activation
        for (let n = 0; n < this.neurons.length; n++) {
            this.neurons[n].output = this.activation(this.neurons[n].inputs, this.neurons[n].weights, this.neurons[n].bias);
        }
        // ** Propagate actions
        // calculate inputs for each specific Action neuron
        //let bestSoFar = this.actions[0];
        for (let a = 0; a < this.actions.length; a++) {
            this.actions[a].inputs = [];
            this.actions[a].weights = [];
            this.actions[a].output = 0;
            for (let g = 0; g < this.genome.length; g++) {
                if (this.genome[g].targetType == 1 &&
                    this.genome[g].target.actionType === this.actions[a].actionType) {
                    // collect inputs from sources
                    this.actions[a].inputs.push(this.genome[g].source.output);
                    // collect weights from genome/connections
                    this.actions[a].weights.push(this.genome[g].weight);
                }
            }
            //this.actions[a].output = this.activation(this.actions[a].inputs, this.actions[a].weights, this.actions[a].bias);
            //if (bestSoFar.output < this.actions[a].output)
            //    bestSoFar = this.actions[a];
            //console.log(this.actions[a].actionType+" "+this.actions[a].inputs+" "+this.actions[a].weights);
        }
        // perform activation
        for (let a = 0; a < this.actions.length; a++) {
            this.actions[a].output = this.activation(this.actions[a].inputs, this.actions[a].weights, this.actions[a].bias);
        }
        // determine best action
        let bestSoFar = this.actions[0];
        for (let a = 0; a < this.actions.length; a++) {
            if (bestSoFar.output < this.actions[a].output)
                bestSoFar = this.actions[a];
        }
        // perform the best action
        this.bestAction = bestSoFar;
        return this.bestAction;
    }

    stringify() {
        var stringified = JSON.stringify(this, function (key, val) {
            if (key === 'bestAction' ||
                key === 'source' ||
                key === 'target' ||
                key === 'inputs' ||
                key === 'output' ||
                key === 'weights') {
                return void (0);
            }
            return val;
        });
        return stringified;
    }
}

function generateNeuralNetFromModel(obj) {
    let neuralNet = new NeuralNet;
    neuralNet.neuralNetUUID = obj.neuralNetUUID;
    neuralNet.parentUUID = obj.parentUUID;
    // create inner neurons
    for (n = 0; n < obj.neurons.length; n++) {
        let neuron = new Neuron();
        neuron.index = obj.neurons[n].index;
        neuron.bias = obj.neurons[n].bias;
        neuron.driven = obj.neurons[n].driven;
        neuralNet.neurons.push(neuron);
    }
    // create stimuli
    for (n = 0; n < obj.stimuli.length; n++) {
        let stimuli = new Stimuli();
        stimuli.stimuliType = obj.stimuli[n].stimuliType;
        neuralNet.stimuli.push(stimuli);
    }
    // create actions
    for (n = 0; n < obj.actions.length; n++) {
        let action = new Action();
        action.actionType = obj.actions[n].actionType;
        action.bias = obj.actions[n].bias;
        neuralNet.actions.push(action);
    }
    // create genome
    for (e = 0; e < obj.genome.length; e++) {
        let gene = new Gene();
        gene.weight = obj.genome[e].weight;
        gene.sourceType = obj.genome[e].sourceType;
        gene.sourceIndex = obj.genome[e].sourceIndex;
        gene.targetType = obj.genome[e].targetType;
        gene.targetIndex = obj.genome[e].targetIndex;
        if (gene.sourceType == 0) { // source stimuli 
            gene.source = neuralNet.stimuli[gene.sourceIndex];
        } else { // source neuron
            gene.source = neuralNet.neurons[gene.sourceIndex];
        }
        if (gene.targetType == 0) { // target neuron
            gene.target = neuralNet.neurons[gene.targetIndex];
        } else { // target action
            gene.target = neuralNet.actions[gene.targetIndex];
        }
        neuralNet.genome.push(gene);
    }
    return neuralNet;
}

function generateRandomNeuralNet() {
    let neuralNet = new NeuralNet;
    // create a number of inner neurons
    let numIN = randomInt(minNeurons, maxNeurons);
    for (n = 0; n < numIN; n++) {
        let neuron = new Neuron();
        neuron.index = n;
        neuralNet.neurons.push(neuron);
    }
    // create a number of stimuli
    for (n = 0; n < stimuliType.length; n++) {
        let stimuli = new Stimuli();
        stimuli.stimuliType = stimuliType[n];
        neuralNet.stimuli.push(stimuli);
    }
    // create a number of actions
    for (n = 0; n < actionType.length; n++) {
        let action = new Action();
        action.actionType = actionType[n];
        neuralNet.actions.push(action);
    }
    // create genome mapping inner neurons with stimuli and action neurons
    let numGenes = randomInt(minGenes, maxGenes);
    for (e = 0; e < numGenes; e++) {
        let disallow = false;
        let gene = new Gene();
        gene.weight = Math.random() * (Math.round(Math.random()) ? 1 : -1);
        let srcN = randomInt(0, 1);
        if (srcN === 0) { // Stimuli
            let index = randomInt(0, stimuliType.length - 1);
            gene.sourceType = 0; // Stimuli
            gene.sourceIndex = index;
            gene.source = neuralNet.stimuli[index];
        } else { // Neuron
            index = randomInt(0, neuralNet.neurons.length - 1);
            gene.sourceType = 1; // Neuron
            gene.sourceIndex = index;
            gene.source = neuralNet.neurons[index];
        }
        let trgN = randomInt(0, 1);
        if (trgN === 0) { // Neuron
            if (gene.sourceType == 1) {
                disallow = true;
            }
            index = randomInt(0, neuralNet.neurons.length - 1);
            gene.targetType = 0; // Neuron
            gene.targetIndex = index;
            gene.target = neuralNet.neurons[index];
        } else { // Action
            let index = randomInt(0, actionType.length - 1)
            gene.targetType = 1; // Action
            gene.targetIndex = index;
            gene.target = neuralNet.actions[index];
        }
        if (!disallow) {
            neuralNet.genome.push(gene);
        } else {
            e--;
        }
    }
    return neuralNet;
}

