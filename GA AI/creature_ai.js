const creatures = [];

class Creature {
    creatureUUID = "";
    pos = { x: 0, y: 0 };
    hasKilled = false;
    nextBestPos;
    lastBestPos;
    vDist = 1;
    neuralNet;

    constructor() {
        this.creatureUUID = UUIDGenerator();
    }

    fire() {
        actLog = "cy: " + cycle;
        // ** Propagate stimuli
        for (let g = 0; g < this.neuralNet.genome.length; g++) {
            if (this.neuralNet.genome[g].sourceType == 0) {
                let stimuli = this.neuralNet.genome[g].source
                stimuli.output = sense(stimuli.stimuliType, this);
            }
        }
        // ** Propagate neuralNets neurons
        this.neuralNet.fire();
    }

    cloneObject() {
        let clone = new Creature();
        clone.pos.x = this.pos.x;
        clone.pos.y = this.pos.y;
        clone.neuralNet = this.neuralNet.cloneObject();
        return clone;
    }

    stringify() {
        return this.neuralNet.stringify();
    }
}

function getPosColour(x, y) {
    let p = ctx.getImageData(x, y, 1, 1).data;
    return "#" + ("000000" + rgbToHex(p[0], p[1], p[2])).slice(-6);
}

function collision(pos, direction) {
    let xm = (direction == "LEFT" ? -1 : (direction == "RIGHT" ? 1 : 0));
    let ym = (direction == "UP" ? -1 : (direction == "DOWN" ? 1 : 0));
    let c = getPosColour(pos.x + xm, pos.y + ym)
    return (("#000000" != c) && ("#ff0000" != c));
}

function findNextBestPos(creature, target) {
    let c = creature;
    let di = [
        { id: "RIGHT", x: c.pos.x + c.vDist, y: c.pos.y + 0, valid: true, dst: 0 }, // right
        { id: "DOWN", x: c.pos.x + 0, y: c.pos.y + c.vDist, valid: true, dst: 0 }, // down
        { id: "LEFT", x: c.pos.x - c.vDist, y: c.pos.y + 0, valid: true, dst: 0 }, // left
        { id: "UP", x: c.pos.x + 0, y: c.pos.y - c.vDist, valid: true, dst: 0 }  // up
    ];
    for (i=0;i<di.length;i++) {
        let d = di[i];
        d.valid = !collision({ x: d.x, y: d.y });
        d.dst = lineDistance({ x: d.x, y: d.y }, target);
    }
    let best = di.filter(d => d.valid == true)
        .sort((a, b) => {
            return a.dst - b.dst;
        })
        .slice(0, 1);
    if (best.length > 0)
        c.nextBestPos = { x: best[0].x, y: best[0].y };
    else
        c.nextBestPos = c.pos;
}

function targetNearCheck(pos) {
    return (lineDistance(pos, { x: foodx, y: foody }) <= 1)
}

function targetDirectionCheck(w, creature, direction) {
    let a = Math.floor(angle360(
        creature.pos.x,
        creature.pos.y,
        creature.nextBestPos.x,
        creature.nextBestPos.y));
    if (direction === "UP" &&
        a >= 225 &&
        a <= 315) {
        return true;
    } else if (direction === "DOWN" &&
        a >= 45 &&
        a <= 135) {
        return true;
    } else if (direction === "LEFT" &&
        a >= 135 &&
        a <= 225) {
        return true;
    } else if ((direction === "RIGHT") &&
        (a >= 315 ||
            a <= 45)) {
        return true;
    }
    return false;
}

function sense(stimuliType, creature) {
    let pos = creature.pos;
    findNextBestPos(creature, { x: foodx, y: foody });
    output = 0;
    if (stimuliType === 'DUM') {
        output = 1;
    } else if (stimuliType === 'MBU') {
        if (collision(pos, 'UP')) output = 1;
    } else if (stimuliType === 'MBD') {
        if (collision(pos, 'DOWN')) output = 1;
    } else if (stimuliType === 'MBL') {
        if (collision(pos, 'LEFT')) output = 1;
    } else if (stimuliType === 'MBR') {
        if (collision(pos, 'RIGHT')) output = 1;
    } else if (stimuliType === 'TNR') {
        if (targetNearCheck(pos)) output = 10;
    } else if (stimuliType === 'TDU') {
        if (targetDirectionCheck('TDU', creature, "UP")) output = 1;
    } else if (stimuliType === 'TDD') {
        if (targetDirectionCheck('TDD', creature, "DOWN")) output = 1;
    } else if (stimuliType === 'TDL') {
        if (targetDirectionCheck('TDL', creature, "LEFT")) output = 1;
    } else if (stimuliType === 'TDR') {
        if (targetDirectionCheck('TDR', creature, "RIGHT")) output = 1;
    }
    if (output >= 1)
        actLog += " stim:" + stimuliType + "(o:" + output + ") ";
    return output;
}

function doBestAction(creature) {
    actLog += " ba:" + creature.neuralNet.bestAction.actionType + " (o:" + creature.neuralNet.bestAction.output + ")";
    if (doLogBestAction)
        console.log(actLog);
    if (creature.neuralNet.bestAction.actionType == 'IDL') {
        return; // do nothing
    } else if (creature.neuralNet.bestAction.actionType == 'KIL') { // attempt kill
        if (targetNearCheck(creature.pos)) {
            creature.neuralNet.score += killPoints;
            creature.hasKilled = true;
            return;
        }
    } else if (creature.neuralNet.bestAction.actionType == 'MVU') { // move up
        if (!collision(creature.pos, 'UP')) {
            creature.pos.y -= 1;
            return;
        }
    } else if (creature.neuralNet.bestAction.actionType == 'MVD') { // move down
        if (!collision(creature.pos, 'DOWN')) {
            creature.pos.y += 1;
            return;
        }
    } else if (creature.neuralNet.bestAction.actionType == 'MVL') { // move left
        if (!collision(creature.pos, 'LEFT')) {
            creature.pos.x -= 1;
            return;
        }
    } else if (creature.neuralNet.bestAction.actionType == 'MVR') { // move right
        if (!collision(creature.pos, 'RIGHT')) {
            creature.pos.x += 1;
            return;
        }
    } else if (creature.neuralNet.bestAction.actionType == 'MV?') { // move random
        let rndDir = randomInt(0, 3);
        if (rndDir == 0) {
            if (!collision(creature.pos, 'UP'))
                creature.pos.y += -1;
        } else if (rndDir == 1) {
            if (!collision(creature.pos, 'DOWN'))
                creature.pos.y += 1;
        } else if (rndDir == 2) {
            if (!collision(creature.pos, 'LEFT'))
                creature.pos.x += -1;
        } else if (rndDir == 3) {
            if (!collision(creature.pos, 'RIGHT'))
                creature.pos.x += 1;
        }
        return;
    }
}

// Import/Export functions

function loadNeuralNetModel() {
    // use the neuralNetModel const array in neuralNetModel.js to populate the world
    let arr = neuralNetModel;
    console.log('Loading ' + arr.length + ' neuralNets from model');
    for (nb = 0; nb < arr.length; nb++) {
        let creature = new Creature();
        creature.neuralNet = generateNeuralNetFromModel(arr[nb]);
        generateCreaturePosition(creature);
        creatures.push(creature);
    }
    return arr;
}

function exportNeuralNets(arr) {
    let text = "[";
    arr.forEach((neuralNet, i) => {
        text += neuralNet.stringify();
        if (i < arr.length - 1) text += ',';
    });
    text += "]";
    download(text, 'neuralNets.json', 'text/plain');
}