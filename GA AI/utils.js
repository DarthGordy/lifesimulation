const sigmoidK = 2;
function sigmoid(z) {
    return 1 / (1 + Math.exp(-z / sigmoidK));
}

function randomInt(min, max) { // a random integer between min and max
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roundFloat(f) {
    return Math.round((f + Number.EPSILON) * 100) / 100
}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function lineDistance(p1, p2) {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y)
}

function averageArrayValues(arr) {
    const sum = arr.reduce((a, b) => a + b, 0);
    const avg = (sum / arr.length) || 0;
    return avg;
}

function maxArrayValue(arr) {
    const max = arr.reduce((a, b) => Math.max(a, b), -Infinity);
    return max;
}

function minArrayValue(arr) {
    const min = arr.reduce((a, b) => Math.min(a, b), -Infinity);
    return min;
}

function angle(cx, cy, ex, ey) {
    var dy = ey - cy;
    var dx = ex - cx;
    var theta = Math.atan2(dy, dx); // range (-PI, PI]
    theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
    return theta;
}

function angle360(cx, cy, ex, ey) {
    var theta = angle(cx, cy, ex, ey); // range (-180, 180]
    if (theta < 0) theta = 360 + theta; // range [0, 360)
    return theta;
}

const UUIDGenerator = () =>
    ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
    );

function omitKeys(obj, keys) {
    var dup = {};
    for (var key in obj) {
        if (keys.indexOf(key) == -1) {
            dup[key] = obj[key];
        }
    }
    return dup;
}

function download(content, fileName, contentType) {
    var a = document.createElement("a");
    var file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}

function removeDupValsInArr(arr) {
    return arr.filter((value, index, self) => {
        return self.indexOf(value) === index;
    });
}

function sortValsInArray(arr, ascDesc) {
    return arr.sort((a, b) => {
        if (ascDesc.toUpperCase == 'ASC')
            return a - b;
        else
            return b - a;
    });
}