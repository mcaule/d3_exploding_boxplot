import * as d3 from 'd3';
import explodingBoxplot from 'd3_exploding_boxplot';

// generate random data
var box1 = d3.range(100).map(d3.random.normal(Math.random() * 100, 5))
            .map(function (d, i) {
              return {v: d, g: 'box1', t: 'pt 1' + i};
            });

var box2 = d3.range(100).map(d3.random.normal(Math.random() * 100, 30))
            .map(function (d, i) {
              return {v: d, g: 'box2', t: 'pt 2' + i};
            });

var box3 = d3.range(100).map(function () {
  return Math.random() * 100;
})
            .map(function (d, i) {
              return {v: d, g: 'box3', t: 'pt 3' + i};
            });

var box4 = d3.range(80).map(d3.random.normal(50, 5))
          .concat(d3.range(20).map(d3.random.normal(50, 25)))// with outliers
          .map(function (d, i) {
            return {v: d, g: 'box4', t: 'pt 4' + i};
          });

var data = box1.concat(box2).concat(box3).concat(box4);

// chart(data,aes)
// aesthetic :
// y : point's value on y axis
// group : how to group data on x axis
// color : color of the point / boxplot
// label : displayed text in toolbox
var chart = explodingBoxplot(data, {y: 'v', group: 'g', color: 'g', label: 't'});

// call chart on a div
chart('#chart-container');
