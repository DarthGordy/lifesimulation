// Evolution functions

function naturalSelection(scoreWatershed) {
    // remove all creatures that score less than scoreWatershed
    let toRemove = []; // indexes of creatures to remove
    creatures.forEach((creature, ind) => {
        if (creature.neuralNet.score < scoreWatershed) {
            toRemove.push(ind);
        }
    });
    for (let i = toRemove.length - 1; i >= 0; i--) {
        creatures.splice(toRemove[i], 1);
    }
}

function reproduction() {
    // use the existing population to generate new creatures
    // the new creatures will be created as a copy of the previous gen
    // the distribution of new creatures will be equal 
    // (each parent equally will reproduce until full population)
    let crit = 0;
    let critlen = creatures.length;
    for (i = 0; i < maxCreatures - critlen; i++) {
        if (crit >= critlen) {
            crit = 0;
        } else {
            crit++;
        }
        try {
            creatures.push(creatures[crit].cloneObject());
        } catch (e) {
            console.log('ERROR: Unable to clone creature: ' + crit);
            console.log(creatures[crit]);
        }
    }
}

function geneticMutation() {
    let numToMutate = Math.floor(creatures.length * maxMutations);
    for (i = 0; i < numToMutate; i++) {
        let neuralNet = creatures[i].neuralNet;
        let mutationType = randomInt(0, 10);
        if (mutationType == 0) { // source gene to stimuli
            let genI = randomInt(0, neuralNet.genome.length - 1);
            let newNI = randomInt(0, stimuliType.length - 1);
            let gene = neuralNet.genome[genI];
            gene.sourceType = 0;
            gene.sourceIndex = newNI;
            gene.source = neuralNet.stimuli[newNI];
        } else if (mutationType == 1) { // target gene to action
            let genI = randomInt(0, neuralNet.genome.length - 1);
            let newNI = randomInt(0, actionType.length - 1);
            let gene = neuralNet.genome[genI];
            gene.targetType = 1;
            gene.targetIndex = newNI;
            gene.target = neuralNet.actions[newNI];
        } else if (mutationType == 2) { // action bias
            let actI = randomInt(0, neuralNet.actions.length - 1);
            neuralNet.actions[actI].randomiseBias();
        } else if (mutationType == 3) { // new gene
            let gene = new Gene();
            gene.weight = Math.random() * (Math.round(Math.random()) ? 1 : -1);
            let srcNI = randomInt(0, stimuliType.length - 1);
            gene.sourceType = 0;
            gene.sourceIndex = srcNI;
            gene.source = neuralNet.stimuli[srcNI];
            let trgNI = randomInt(0, actionType.length - 1);
            gene.targetType = 1;
            gene.targetIndex = trgNI;
            gene.target = neuralNet.actions[trgNI];
            neuralNet.genome.push(gene);
        } else if (mutationType == 4) { // switch neuron's driven
            let neuI = randomInt(0, neuralNet.neurons.length - 1);
            if (neuI < neuralNet.neurons.length) {
                let neu = neuralNet.neurons[neuI];
                neu.driven = (neu.driven ? false : true);
            }
        } else if (mutationType == 5) { // gift an action a positive bias
            let actI = randomInt(0, neuralNet.actions.length - 1);
            neuralNet.actions[actI].bias = 2;
        } else if (mutationType == 6) { // remove a gene
            let genI = randomInt(0, neuralNet.genome.length - 1);
            neuralNet.genome.splice(genI, 1);
        } else if (mutationType == 7) { // connect source to neuron
            let genI = randomInt(0, neuralNet.genome.length - 1);
            let newNI = randomInt(0, neuralNet.neurons.length - 1);
            let gene = neuralNet.genome[genI];
            if (gene.sourceType == 0 && // it's a stimuli
                gene.targetType != 0) { // it's not connected to a neuron
                gene.sourceType = 1; // neuron
                gene.sourceIndex = newNI;
                gene.source = neuralNet.neurons[newNI];
            }
        } else if (mutationType == 8) { // connect target to neuron
            let genI = randomInt(0, neuralNet.genome.length - 1);
            let newNI = randomInt(0, neuralNet.neurons.length - 1);
            let gene = neuralNet.genome[genI];
            if (gene.targetType == 1 && // it's an action
                gene.sourceType != 1) { // it's not connected to a neuron
                gene.targetType = 0; // neuron
                gene.targetIndex = newNI;
                gene.target = neuralNet.neurons[newNI];
            }
        } else if (mutationType == 9) { // connect TNR to KIL
            let gene = new Gene();
            gene.weight = 1;
            gene.sourceType = 0;
            gene.sourceIndex = 5; // TNR
            gene.source = neuralNet.stimuli[gene.sourceIndex];
            gene.targetType = 1;
            gene.targetIndex = 1; // KIL
            gene.target = neuralNet.actions[gene.targetIndex];
            gene.target.bias = 1;
            neuralNet.genome.push(gene);
        } else { // mutate gene weight
            let genI = randomInt(0, neuralNet.genome.length - 1);
            let gene = neuralNet.genome[genI];
            gene.weight = Math.random() * (Math.round(Math.random()) ? 1 : -1);
        }
    }
}


function pruneGenes() {
    // remove all creature's genes that are duplicates
    for (c = 0; c < creatures.length; c++) {
        let genesToRemove = [];
        for (g = 0; g < creatures[c].neuralNet.genome.length; g++) {
            for (cg = 0; cg < creatures[c].neuralNet.genome.length; cg++) {
                if (g != cg &&
                    creatures[c].neuralNet.genome[g].sourceType == creatures[c].neuralNet.genome[cg].sourceType &&
                    creatures[c].neuralNet.genome[g].sourceIndex == creatures[c].neuralNet.genome[cg].sourceIndex &&
                    creatures[c].neuralNet.genome[g].targetType == creatures[c].neuralNet.genome[cg].targetType &&
                    creatures[c].neuralNet.genome[g].targetIndex == creatures[c].neuralNet.genome[cg].targetIndex &&
                    creatures[c].neuralNet.genome[g].weight >= creatures[c].neuralNet.genome[cg].weight) {
                    genesToRemove.push(cg);
                }
            }
        }
        if (genesToRemove.length > 0) {
            // dedup genes to remove and sort ascending
            removeDupValsInArr(genesToRemove);
            sortValsInArray(genesToRemove, 'desc');
            // remove genes...
            for (let i = genesToRemove.length - 1; i >= 0; i--) {
                creatures[c].neuralNet.genome.splice(genesToRemove[i], 1);
            }
        }
    }
}