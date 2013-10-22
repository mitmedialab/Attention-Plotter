/*!
 * Attention Plotter Javascript
 * https://github.com/erhardt/Attention-Plotter
 */

// Dimensions of the graph
var graphwidth = 2000;
var graphheight = 400;

// d3 params and helper functions
var margin = {top: 0, right: 0, bottom: 50, left: 0},
    width = graphwidth - margin.left - margin.right,
    height = graphheight - margin.top - margin.bottom;

// Runs functions after page loads
$(window).load(function() {
  //adjustElements();
  buttonSwitcher();
  giveCredit();
});

var x0 = d3.scale.ordinal()
    .rangeRoundBands([0, width], 0.1, 0);

var x1 = d3.scale.ordinal();

var y = d3.scale.linear()
    .rangeRound([height, 0]);

var color = d3.scale.category10();

var xAxis = d3.svg.axis()
    .scale(x0)
    .orient('bottom');

var line = d3.svg.line()
    .interpolate('monotone')
    .x(function(d) { return x0(d.date)-x0offset+Math.floor(x0.rangeBand()/2); }) // uses color index to capture # of media types
    .y(function(d) { return y(d.value); });

var svg = d3.select('#vis').append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
  .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
var svgBg = svg.append('g').attr('class', 'bg');

var aplotterTimestampToDate = function (d) {
  date = new Date(d * 1000);
  var y = date.getFullYear();
  var m = date.getMonth() + 1;
  var mday = date.getDate();
  return m + '/' + mday;
};

// d3 MAIN FUNCTION (starts by reading data from the mediacsv file)
var plotData = function(mediaS) {

  // get layer names
  var mediaH = mediaS.map(function (d) { return d.name; });
  
  // get dates
  var dates = mediaS[0].values.map(function (d) { return d.date; });
  
  // Organize data by date
  var dataByDate = [];
  jQuery.each(dates, function (i, d) {
    elt = {
      'date': d
      , 'media': mediaS.map(function (d) { return {'name':d.name, 'value':d.values[i]}; })
    }
    dataByDate.push(elt);
  });
  window.dataByDate = dataByDate;
  
  // creates data map for sparklines
  color.domain(mediaH);

  // sets x- and y-axis dimensions
  x0.domain(dates.map(aplotterTimestampToDate));
  x0offset = x0(aplotterTimestampToDate(dates[0]));
  x1.domain(mediaH).rangeRoundBands([0, x0.rangeBand()]);
  var layerMax = function(layer) {
    return d3.max(layer.values, function(d) { return d.value; });
  }
  y.domain([0, d3.max(mediaS, layerMax)]);

  // creates x-axis
  svg.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(' + (-x0offset) + ',' + height + ')')
      .call(xAxis);
  d3.selectAll('.x.axis .tick line')
    .attr('stroke', 'black');
  d3.selectAll('.x.axis path').remove();

  // rotates x-axis labels
  svg.selectAll('.x.axis text')  // select all the text elements for the x-axis
      .attr('style', 'text-anchor: end;')
      .attr('transform', function(d) {
          //return 'translate(' + this.getBBox().height*-0.5 + ',' + this.getBBox().height*0.5 + ')rotate(-45)'; // angled
          return 'translate(' + this.getBBox().height*-1.1 + ',' + this.getBBox().height*0.9 + ')rotate(-90)'; // vertical
      });
      
  // Add custom class to x axis labels
  $('.x.axis .tick.major').each(function (i, d) {
    d3.select(d).classed('date-' + dates[i], true);
  });

  // instantiates media.csv data
  var mediumH = svg.selectAll('.date')
      .data(dataByDate)
    .enter().append('g')   // create svg group (g) for every date
      .attr('class', 'g date')
      .attr('id', function(d) { return 'graph-dategroup-' + d['date']; })
      .attr('transform', function(d) { return 'translate(' + (x0(d.date) - x0offset) + ',0)'; });
  
  // generates x axis 'platforms' for bars over each date
  mediumH.selectAll('line.platform')
      .data(mediaH)
    .enter().append('line')
      .attr('class','platform')
      .attr('stroke-width', '1')
      .attr('stroke', 'black')
      .attr('x1', function (d) { return x1(d); })
      .attr('y1', height + 0.5)
      .attr('x2', function (d) { return x1(d) + x1.rangeBand(); })
      .attr('y2', height + 0.5);

  // Create count label and reference line
  countShadow = svg.append('text').text('0')
    .attr('fill', 'white')
    .attr('stroke', 'white')
    .attr('stroke-width', '2')
    .attr('font-weight', 'bold')
    .attr('opacity', '0');
  countLabel = svg.append('text').text('0')
    .attr('opacity', '0');
  countLine = svgBg.append('line')
    .attr('stroke', '#d7d7d7')
    .attr('x1', 0).attr('x2', width - 2*x0offset)
    .attr('y1', 0).attr('y2', 0)
    .attr('opacity', 0);
      
  // creates bars
  var bars = mediumH.selectAll('rect')
      .data(function(d) { return d.media; });
  bars
    .enter().append('rect')
      .attr('class', function(d) { return 'active bar' + mediaH.indexOf(d.name); }) // index on array
      .style('fill', function(d) { return color(d.name); })
      .attr('width', x1.rangeBand())
      .attr('x', function(d) { return x1(d.name); })
      .attr('y', function(d) { return y(d.value.value) - 1; })
      .attr('height', function(d) { return height - y(d.value.value); });
  bars
    .on('mouseover', function (d) {
      if (d3.select(this).classed('active')) {
        d3.select(this).attr('opacity', 0.75);
        countShadow.text(d.value.raw);
        countLabel.text(d.value.raw);
        var lx = x0(aplotterTimestampToDate(d.value.date)) - x0offset + x1(d.name);
        var ly = y(d.value.value) - 0.5;
        countLine.attr('y1', ly).attr('y2', ly);
        countLine.attr('opacity', 1);
        if (lx > width/2) {
          lx = lx - countLabel[0][0].getBBox().width - 2;
        } else {
          lx = lx + x1.rangeBand() + 2;
        }
        if (ly > height/2) {
          ly = ly - 5;
        } else {
          ly = ly  + 10 + 5;
        }
        countShadow.attr('x', lx).attr('y', ly).attr('opacity', 1)
        countLabel.attr('x', lx).attr('y', ly).attr('opacity', 1);
      }
    })
    .on('mouseout', function (d) {
      if (d3.select(this).classed('active')) {
        d3.select(this).attr('opacity', 1);
        countLine.attr('opacity', 0);
        countShadow.attr('opacity', 0);
        countLabel.attr('opacity', 0);
      }
    })

  // creates legend
  var legend = d3.select('#legend');
  var legenditem = legend.selectAll('.item')
      .data(mediaH.slice())
    .enter().append('span')
      .style('display', 'inline-block')
      .attr('class', 'item');

  legenditem.append('div')
      .attr('class', function(d) { return 'legend-item lbox' + mediaH.indexOf(d) + ' active'; } ) // index on array
      .style('width', '20px')
      .style('height', '20px')
      .style('display', 'inline-block')
      .style('vertical-align', 'bottom')
      .style('background', color)
      .on('click',function(d) { 
        var classnum = mediaH.indexOf(d);
        if(d3.select('#legend div.lbox'+classnum).classed('active')) {
          d3.selectAll('#vis rect.bar'+classnum).transition(100).attr('opacity',0.15).style('fill', '#000');
          d3.selectAll('#vis path.line'+classnum).transition(100).attr('opacity',0.15).style('stroke', '#000');
          d3.select(this).transition(100).style('opacity',0.15).style('background', '#000');
          d3.select('#legend div.lbox'+classnum).classed('active', false);
          d3.selectAll('rect.bar'+classnum).classed('active', false);
        } else {
          d3.selectAll('#vis rect.bar'+classnum).transition(100).attr('opacity',1).style('fill', color(d));
          d3.selectAll('#vis path.line'+classnum).transition(100).attr('opacity',1).style('stroke', color(d));
          d3.select(this).transition(100).style('opacity',1).style('background', color(d));
          d3.select('#legend div.lbox'+classnum).classed('active', true);
          d3.selectAll('rect.bar'+classnum).classed('active', true);
        }
      });
  
  legenditem.append('span')
      .attr('class', function(d) { return 'legend-label ltext' + mediaH.indexOf(d); } ) // index on array
      .style('margin-right', '15px')
      .text(function(d) { return ' ' + d; });

  // creates sparklines
  var mediumS = svg.selectAll('.mediumS')
      .data(mediaS)
    .enter().append('g')
      .attr('class', 'mediumS');

  mediumS.append('path')
      .attr('class', function(d) { return 'line line' + color.domain().indexOf(d.name); }) // use color as an index
      .attr('d', function(d) { return line(d.values); })
      .attr('fill', 'none')
      .attr('stroke', function(d) { return color(d.name); });
      
  showBars();
};

// Resizes the body element and sets the horizontal scroll functions for the header and legend
function adjustElements() {
  $('body').width($('#vis svg').width());
  $('body').height($('#header').outerHeight() + $('#vis').outerHeight() + $('#legend').outerHeight());

  $(window).scroll(function(){
    // if statement stops it from continually scrolling left
    if ($(this).scrollLeft() > $('body').width()-$(window).width()) {
      $('body').css('overflow-x','hidden');
      $(this).scrollLeft($('body').width()-$(window).width());
    } else {
      $('body').css('overflow-x','visible');
      $('#header').css({
          'left': $(this).scrollLeft()
      });
      $('#legend').css({
          'left': $(this).scrollLeft()
      });
    }
  });
}

// Show spark lines and hide bar graph
function showSparks() {
  $(this).attr('class','btn active');
  $('#barbutton').attr('class','btn');
  $('#vis rect').hide();
  $('#vis .platform').hide();
  $('path.line').show();
}

// Show bar graph and hide spark lines
function showBars() {
  $(this).attr('class','btn active');
  $('#linebutton').attr('class','btn');
  $('path.line').hide();
  $('#vis .platform').show();
  $('#vis rect').show();
}

// Adds functionality to switch between graph types using radio buttons
function buttonSwitcher() {
  $('.btn-group').find('button').bind('click',function(event){
    if($(this).attr('id')==='linebutton'){
      if($(this).attr('class')!=='btn active'){
        showSparks();
      }
    } else {
      if($(this).attr('class')!=='btn active'){
        showBars();
      }  
    }
  });
}

//Adds word cloud popovers on the timeline dates
function wordClouds(data) {

  var wordcloud = '';
  var wordmax = 50; // max # of words to allow in wordcloud
  var wordnum = 0;
  //var lastdate = d[0].date; // used to group words on the same date

  $.each(data, function (layerIndex, layer) {
    // Create a word cloud for each date in this layer
    $.each(layer['values'], function (dIndex, d) {
      var wordcloud = '';
      var wordnum = 0;
      var date = Number(d['date']);
      // Add each word to its word cloud
      $.each(d['words'], function (wordIndex, word) {
        // Calculate the size of the word, ignoring small ones
        var size = Math.log(word['value'])*4;
        if (size >= 4) {
          wordcloud = wordcloud + '<span style="font-size:' + size + 'px">' + word['term'] + '</span> ';
        }
      });
      // Add the wordcloud to the document
      if (wordcloud != "") {    // ignore empty word clouds to preserve "insufficient data" popovers
        var attachTo = $('.date-' + date);
        // Delete any existing popovers
        if (attachTo.popover('getData') != null) {
          attachTo.popover('destroy');
        }
        // Add the new popover
        $(attachTo).popover({
          'title': aplotterTimestampToDate(date),
          'content': wordcloud,
          'position': 'top',
          'trigger': 'hover'
        });
      }
    });
  });
}

// Adds credit span to #description + popover
function giveCredit() {
  var content = ' <span id="credit">Built with <span id="creditlink">Attention Plotter</span>.</span>';
  $('#description p').append(content);
  window.setTimeout(creditPopover(), 1);
}

function creditPopover() {
  var content = 'Attention Plotter is part of the <a href="http://civic.mit.edu/controversy-mapper">Controversy Mapper</a> project at the <a href="http://civic.mit.edu/">MIT Center for Civic Media</a>.';
  $('#description p #creditlink').popover({
            'content': content,
            'position': 'right',
            'horizontalOffset': 20,
            'trigger': 'hover'
  });
}
