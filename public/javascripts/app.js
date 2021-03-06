var app = angular.module('figure', ['lvl.directives.dragdrop']);

var socket = io.connect();
var client;

app.controller('mainCtrl', function($scope) {
    var dataObjectArray;
    $scope.fieldsArray = new Array();

    $scope.visualizationList = ['Line Graph', 'Pie Chart'];
    $scope.visualizationDescriptions = {"Line Graph": 'A graph that uses points connected by lines to show how something changes in value(as time goes by, or as something else happens).',
                                        "Pie Chart": 'A type of graph in which a circle is divided into sectors that each represent a proportion of the whole.'};
    var vis;
    var chartTitle;

    $(document).ready( function() {
        client = new client(socket);

        $("#data").bind('paste', function(e) {
            var elem = $(this);

            setTimeout(function() {
                dataObjectArray = $.csv.toObjects($('#data').val());

                generateFields();
            }, 1000);
        });

        //Choropleth Map
        var map = L.mapbox.map('map', 'examples.map-i86nkdio').setView([37.8, -96], 4);

        var popup = new L.Popup({ autoPan: false });

        // statesData comes from the 'us-states.js' script included above
        var statesLayer = L.geoJson(statesData,  {
          style: getStyle,
          //onEachFeature: onEachFeature
        }).addTo(map);

        function getStyle(feature) {
          return {
              weight: 2,
              opacity: 0.1,
              color: 'black',
              fillOpacity: 0.7,
              fillColor: getColor(feature.properties.density)
          };
        };

        // get color depending on population density value
        function getColor(d) {
          return d > 1000 ? '#8c2d04' :
              d > 500  ? '#cc4c02' :
              d > 200  ? '#ec7014' :
              d > 100  ? '#fe9929' :
              d > 50   ? '#fec44f' :
              d > 20   ? '#fee391' :
              d > 10   ? '#fff7bc' :
              '#ffffe5';
        };
    });

    $scope.selectTab = function(tabNum) {
        $('#tab' + tabNum).addClass('active');

        if (tabNum == 1) {
            $('#tab2').removeClass('active');
        }
        else {
            $('#tab1').removeClass('active');
        }
    };

    $scope.selectSampleData = function(num) {
        //$('#sampleData').innerHTML = ""
        client.getSampleData(num);
        scrollToSection('#visualizationDropdown', 100);
    };

    function scrollToSection( id, offset ) {
        $('html, body').animate({
            // scroll the next portion into view, take into account the header pane and the button itself
            scrollTop: $(id).offset().top - offset
        }, 1000);
    }

    function generateFields() {

        if( !dataObjectArray || dataObjectArray.length == 0 ) {
            scrollToSection('body', 0);
            return false;
        }

        $('#fields').empty();

        $scope.fieldsArray = Object.keys(dataObjectArray[0]);
        document.getElementById('fields').setAttribute('ng-repeat', 'field in fieldsArray');

        var i;

        for (i = 0; i < $scope.fieldsArray.length; i++) {
            var li = document.createElement('li');
            li.setAttribute('style', 'width: 100%; -moz-user-select: none; -webkit-user-select: none; -ms-user-select: none; user-select: none;');
            li.setAttribute('x-lvl-draggable', 'true');
            li.setAttribute('draggable', 'true');
            li.setAttribute('id', $scope.fieldsArray[i]);
            li.setAttribute('class', 'ui-draggable')

            //var liHTML = '<li style="width: 210px; -moz-user-select: none; -webkit-user-select: none; -ms-user-select: none; user-select: none;" x-lvl-draggable="true" draggable="true" id="day" class="ui-draggable"><a>day</a></li>';

            //$('#fields').append(liHTML);

            var a = document.createElement('a');
            a.innerHTML = $scope.fieldsArray[i];

            li.appendChild(a);

            angular.element(document).injector().invoke(function($compile) {
                  $compile(li)($scope);
            });

            document.getElementById('fields').appendChild(li);
        }
    };

    socket.on('sendSampleData', function(data) {
        dataObjectArray = $.csv.toObjects(data);
        $('#data').html(data);

        generateFields();
    });

    $scope.selectVisualization = function(v) {
        var text = document.getElementById('visualizationDropdown').innerHTML;
        text = text.substring(0, text.lastIndexOf(">") + 1);
        text += v;
        document.getElementById('visualizationDropdown').innerHTML = text;

        document.getElementById('previewImage').src = '/images/' + v + '.png';
        document.getElementById('visualizationDescription').innerHTML = $scope.visualizationDescriptions[v];

        vis = v;

        $('#dropArea').empty();

        var toAppend = '<label>XLABEL</label>'
                     + '<div id="x" style="display: inline-block; border: 1px solid grey; width: 125px; height: 35px; text-align: center; vertical-align: middle; line-height: 35px;" x-lvl-drop-target="true" x-on-drop="dropped(dragEl, dropEl)"></div>'
                     + '<br><br>'
                     + '<label>YLABEL</label>'
                     + '<div id="y" style="display: inline-block; border: 1px solid grey; width: 125px; height: 35px; text-align: center; vertical-align: middle; line-height: 35px;" x-lvl-drop-target="true" x-on-drop="dropped(dragEl, dropEl)"></div>'
                     + '<br><br>'
                     + '<label>Title</label>'
                     + '<input type="text" id="chartTitle" style="height:35px;" size="100" placeholder="Optional"/>'
                     + '<br><br>'
                     + '<button type="button" class="btn btn-danger" ng-click="clearFields()">Clear Fields</button>';

        if (vis == 'Line Graph') {
            toAppend = toAppend.replace('XLABEL', 'X Axis').replace('YLABEL', 'Y Axis');
        }
        else if (vis == 'Pie Chart') {
            toAppend = toAppend.replace('XLABEL', 'Value Field').replace('YLABEL', 'Count Field (Optional)');
        }

        $('#dropArea').append(toAppend);

        angular.element(document).injector().invoke(function($compile) {
              $compile($('#dropArea'))($scope);
        });

        $('#chartTitle').on('keyup', function() {
            if ($('#title').length != 0)
                $('#title').html($('#chartTitle').val());
        });

        if (vis == 'Line Graph' && $('#x').html() != '' && $('#y').html() != '' && vis != undefined) {
            plotLine();
        }
        else if (vis == 'Pie Chart' && $('#x').html() != '') {
            plotPie();
        }

        scrollToSection('#draggable-fields-heading', 106);
    };

    $scope.clearFields = function() {
        $('#x').html('');
        $('#y').html('');

        $('#graph-result').html('<svg></svg>');
        $('#title').html('');
        $('#chartTitle').val('');
    };

    $scope.dropped = function(dragEl, dropEl) {
        var drag = angular.element( document.getElementById(dragEl) );
        var drop = angular.element( document.getElementById(dropEl) );

        $('#' + drop.attr('id')).html(drag.attr('id'));

        if (vis == 'Line Graph' && $('#x').html() != '' && $('#y').html() != '' && vis != undefined) {
            plotLine();
        }
        else if (vis == 'Pie Chart' && $('#x').html() != '') {
            plotPie();
        }
    };

    function parseDate(date, delimiter) {
        return (date.split(delimiter));
    };

    function plotLine() {
        $('svg').empty();
        $('#title').html('');
        chartTitle = $('#chartTitle').val();

        var values = new Array();
        var dateArray;
        var chartData;
        var i;
        var isDate = false;
        var xAxis = $('#x').html();
        var yAxis = $('#y').html();

        if (xAxis == 'date')
            isDate = true;

        for (i = 0; i < dataObjectArray.length; i++) {
            var xValue = dataObjectArray[i][xAxis];
            var yValue = dataObjectArray[i][yAxis];

            if (yValue == '')
                yValue = '0';

            if (isDate == true) {
                if (xValue.indexOf('/') != -1)
                    dateArray = parseDate(xValue, '/');
                else if (xValue.indexOf('-') != -1)
                    dateArray = parseDate(xValue, '-');

                xValue = new Date(dateArray[2], dateArray[0] - 1, dateArray[1]);
                xValue = xValue.getTime();
                values.push({x: xValue, y: parseInt(yValue)});
            }
            else
                values.push({x: parseInt(xValue), y: parseInt(yValue)});
        };

        chartData = [{
            values: values,
            key: yAxis,
            color: '#ff7f0e'
        }];

        $('#title').html(chartTitle);

        nv.addGraph(function() {
            var chart = nv.models.lineChart()
                .margin({left: 100, right: 70})
                .useInteractiveGuideline(true)
                .transitionDuration(350)
                .showYAxis(true)
                .showXAxis(true);

            chart.xAxis.showMaxMin(true);
            chart.xAxis.axisLabel(xAxis)

            if (isDate == true) {
                chart.xAxis.tickFormat(function(d) {
                    return d3.time.format('%x')(new Date(d));
                });
            }
            else
                chart.xAxis.tickFormat(d3.format(',g'));

            chart.yAxis.axisLabel(yAxis).tickFormat(d3.format(',g'));

            d3.select('#graph-result svg').datum(chartData).call(chart);
            nv.utils.windowResize(chart.update());

            return chart;
        });
    };

    function addToArray(array, element) {
        var i;

        for (i = 0; i < array.length; i++) {
            if (array[i]['label'] == element)
            {
                array[i]['value']++;
                return (array);
            }
        }

        array.push({'label': element, 'value': 1});
        return (array);
    };

    function plotPie() {
        $('svg').empty();
        $('#title').html('');
        chartTitle = $('#chartTitle').val();

        var cumulativeArray = new Array();
        var valueLabel = $('#x').html();
        var countField = $('#y').html();
        var i;

        chartData = new Array();

        //dataObjectArray = [{'orangeBoardings': 1}, {'orangeBoardings': 1}, {'orangeBoardings': 1}, {'orangeBoardings': 2}, {'orangeBoardings': 2}, {'orangeBoardings': 3}]
        if (countField == '') {
            for (i = 0; i < dataObjectArray.length; i++) {
                var value = dataObjectArray[i][valueLabel];

                if (value != '')
                    chartData = addToArray(chartData, value);
            }

            //chartData = [{'label': 'orangeBoardings', 'value': 1}, {'label': 'orangeBoardings', 'value': 2}, {'label': 'orangeBoardings', 'value': 3}];
        }
        else {
            for (i = 0; i < dataObjectArray.length; i++) {
                chartData.push({'label': dataObjectArray[i][valueLabel], 'value': dataObjectArray[i][countField]});
            }
        }

        $('#title').html(chartTitle);

        nv.addGraph(function() {
            var chart = nv.models.pieChart()
                .x(function(d) { return d.label; })
                .y(function(d) { return d.value; })
                .showLabels(true);

            d3.select('#graph-result svg')
                .datum(chartData)
                .transition().duration(350)
                .call(chart);

            nv.utils.windowResize(chart.update());

            return chart;
        });
    };

});
