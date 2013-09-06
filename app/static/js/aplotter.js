/*!
 * Attention Plotter Javascript
 * https://github.com/erhardt/Attention-Plotter
 */

// Dimensions of the graph
var graphwidth = 2000;
var graphheight = 400;

// d3 params and helper functions
var margin = {top: 50, right: 80, bottom: 50, left: 80},
    width = graphwidth - margin.left - margin.right,
    height = graphheight - margin.top - margin.bottom;

// Runs functions after page loads
$(window).load(function() {
  //adjustElements();
  buttonSwitcher();
  //wordClouds();
  giveCredit();
});

var x0 = d3.scale.ordinal()
    .rangeRoundBands([0, width], .1);

var x1 = d3.scale.ordinal();

var y = d3.scale.linear()
    .range([height, 0]);

var color = d3.scale.category10();

var xAxis = d3.svg.axis()
    .scale(x0)
    .orient('bottom');

var line = d3.svg.line()
    .interpolate('monotone')
    .x(function(d) { return x0(d.date)+(x1.rangeBand()*(color.range().length-3)/2); }) // uses color index to capture # of media types
    .y(function(d) { return y(d.value); });

var svg = d3.select('#vis').append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
  .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

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
  x0.domain(dates.map(function (d) {
    date = new Date(d * 1000);
    var y = date.getFullYear();
    var m = date.getMonth() + 1;
    var mday = date.getDate();
    return m + '/' + mday;
  }));
  x1.domain(mediaH).rangeRoundBands([0, x0.rangeBand()]);
  var layerMax = function(layer) {
    return d3.max(layer.values, function(d) { return d.value; });
  }
  y.domain([0, d3.max(mediaS, layerMax)]);

  // creates x-axis
  svg.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0,' + height + ')')
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

  // instantiates media.csv data
  var mediumH = svg.selectAll('.date')
      .data(dataByDate)
    .enter().append('g')   // create svg group (g) for every date
      .attr('class', 'g date')
      .attr('transform', function(d) { return 'translate(' + x0(d.date) + ',0)'; });
  
  // generates x axis 'platforms' for bars over each date
  mediumH.selectAll('line.platform')
      .data(mediaH)
    .enter().append('line')
      .attr('class','platform')
      .attr('stroke-width', '1')
      .attr('stroke', 'black')
      .attr('x1', function (d) { return x1(d) + 0.5; })
      .attr('y1', height + 0.5)
      .attr('x2', function (d) { return x1(d) + 0.5 + x1.rangeBand() + 0.5; })
      .attr('y2', height + 0.5);

  // creates bars
  mediumH.selectAll('rect')
      .data(function(d) { return d.media; })
    .enter().append('rect')
      .attr('class', function(d) { return 'bar' + mediaH.indexOf(d.name); }) // index on array
      .style('fill', function(d) { return color(d.name); })
      .attr('width', x1.rangeBand())
      .attr('x', function(d) { return x1(d.name); })
      .attr('y', function(d) { return y(d.value.value)-1; })
      .attr('height', function(d) { return height - y(d.value.value); });

  // creates legend
  var legendHeight = 25*(color.range().length-3); // height varies by number of legend items
  var legendWidth = 500;

  var legend = d3.select('#legend').append('svg')
      .attr('width', legendWidth)
      .attr('height', legendHeight);

  var legenditem = legend.selectAll('g')
      .data(mediaH.slice())
    .enter().append('g')
      .attr('transform', function(d, i) { return 'translate(0,' + i * 20 + ')'; });

  legenditem.append('rect')
      .attr('class', function(d) { return 'lbox' + mediaH.indexOf(d); } ) // index on array
      .attr('x', 0)
      .attr('width', 18)
      .attr('height', 18)
      .style('fill', color)
      .on('click',function(d) { 
        var classnum = mediaH.indexOf(d);
        if(d3.select('#legend text.ltext'+classnum).attr('class')==='ltext'+classnum) {
          d3.selectAll('#vis rect.bar'+classnum).transition().duration(0).attr('opacity',0.15).style('fill', '#000');
          d3.selectAll('#vis path.line'+classnum).transition().duration(0).attr('opacity',0.15).style('stroke', '#000');
          d3.select(this).transition().duration(0).attr('opacity',0.15).style('fill', '#000');
          d3.select('#legend text.ltext'+classnum).transition().duration(0).attr('class','ltext'+classnum+' off');
        } else {
          d3.selectAll('#vis rect.bar'+classnum).transition().duration(0).attr('opacity',1).style('fill', color(d));
          d3.selectAll('#vis path.line'+classnum).transition().duration(0).attr('opacity',1).style('stroke', color(d));
          d3.select(this).transition().duration(0).attr('opacity',1).style('fill', color(d));
          d3.select('#legend text.ltext'+classnum).transition().duration(0).attr('class','ltext'+classnum);
        }
      });

  legenditem.append('text')
      .attr('class', function(d) { return 'ltext' + mediaH.indexOf(d); } ) // index on array
      .attr('x', 24)
      .attr('y', 9)
      .attr('dy', '.35em')
      .style('text-anchor', 'start')
      .text(function(d) { return d; });

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
function wordClouds() {

  // parses wordscsv and creates new popovers containing word clouds logscaled to their counts
  d3.csv(wordscsv, function(d) { 
    var wordcloud = '';
    var wordmax = 50; // max # of words to allow in wordcloud
    var wordnum = 0;
    var lastdate = d[0].date; // used to group words on the same date

    for(var i = 0; i < d.length; i++)
    {
      if(d[i].date == lastdate) {
        if(wordnum <= wordmax) {  
          var size = Math.log(d[i].magnitude)*4;
          if (size >= 4) {        // ignore words too insignificant to even be readable
            wordcloud = wordcloud + '<span style="font-size:' + size + 'px">' + d[i].word + '</span> ';
            wordnum = wordnum+1;
          }
        }
      } else {
        if (wordcloud != "") {    // ignore empty word clouds to preserve "insufficient data" popovers
          if ($('.tick.major:contains("' + lastdate + '")').popover('getData') != null) {
            $('.tick.major:contains("' + lastdate + '")').popover('destroy');   // delete exiting popovers
          }

          $('.tick.major:contains("' + lastdate + '")').popover({
            'title': lastdate,
            'content': wordcloud,
            'position': 'top',
            'trigger': 'hover'
          });
        }
        wordcloud = '';
        wordnum = 0;
        lastdate = d[i].date;
      }
    }

    window.setTimeout(emptyPopovers(), 1);
  });
}

// Loads empty popovers for dates without wordclouds
function emptyPopovers() {
  $.each($('.tick.major'), function() {
    if ($(this).popover('getData') == null ) {
      $(this).popover({
        'content': '<span style="font-style:italic;">insufficient data</span>',
        'position': 'top',
        'trigger': 'hover'
      });
    }
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
