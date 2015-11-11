
(function(){

	//<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyCVgE0rGwJ0_mxl_XgywwoMLjXqab-4Evg&libraries=places"type="text/javascript"></script>
	//<script src="http://maps.googleapis.com/maps/api/js?sensor=false&language=en"></script>
    //console.log(profile);

	var app = angular.module("homepage", ["ui.map", "ui.event"]);

	app.factory("GeolocationService", function ($q, $window, $rootScope) {
        return function () {
            var deferred = $q.defer();

            if (!$window.navigator) {
                $rootScope.$apply(function() {
                    deferred.reject(new Error("Geolocation is not supported"));
                });
            } else {
                $window.navigator.geolocation.getCurrentPosition(function (position) {
                    $rootScope.$apply(function() {
                        deferred.resolve(position);
                    });
                }, function (error) {
                    $rootScope.$apply(function() {
                        deferred.reject(error);
                    });
                });
        }

        return deferred.promise;
        }  
    });

    app.service("Map", function($q) {
    
    this.init = function(lat, lng) {
        var options = {
            center: new google.maps.LatLng(lat, lng),
            zoom: 10,
            disableDefaultUI: true    
        }
        this.map = new google.maps.Map(
            document.getElementById("map"), options
        );
        this.places = new google.maps.places.PlacesService(this.map);
    }
    
    this.search = function(str) {
        var d = $q.defer();
        this.places.textSearch({query: str}, function(results, status) {
            if (status == 'OK') {
                d.resolve(results[0]);
            }
            else d.reject(status);
        });
        return d.promise;
    }
    
    this.addMarker = function(res) {
        //if(this.marker) this.marker.setMap(null);
        this.marker = new google.maps.Marker({
            map: this.map,
            position: res.geometry.location,
            animation: google.maps.Animation.DROP,
        });
        this.map.setCenter(res.geometry.location);
    }   
});
	
	app.directive('googleplace', function() {
    return {
        require : 'ngModel',
        link : function(scope, element, attrs, model) {
            var options = {
                types : [],
            };
            scope.gPlace = new google.maps.places.Autocomplete(element[0],
                    options);
 
            google.maps.event.addListener(scope.gPlace, 'place_changed',
                    function() {
                        scope.$apply(function() {
                            model.$setViewValue(element.val());
                        });
                    });
        }
    };
});


    app.controller("homepageCtrl", function($scope, GeolocationService, Map, $http){

		$scope.lat = "0";
        $scope.lng = "0";
        $scope.accuracy = "0";
        $scope.error = "";
        $scope.model = { myMap: undefined };
        $scope.myMarkers = [];	
        $scope.position = null;
    	$scope.message = "Determining gelocation...";
    	$scope.searchPickUp = "";
    	$scope.searchDestination = "";
    	$scope.place = {};
    	$scope.placePickUp = {};
    	$scope.placeDestination = {};
    	$scope.showPickUp = true;
    	$scope.showDestination = false;
    	$scope.showQuote = false;
    	$scope.showSearch = true;
        $scope.distance = {};
        $scope.error = "";
        $scope.pickUpPress = false;
        $scope.destinationPress = false;
        $scope.totalDistance = "";
        $scope.time = "";
    
    	$scope.search = function() {
        			
        	$scope.apiError = false;
        		Map.search($scope.searchPlace).then(function(res) { // success
                Map.addMarker(res);
               	$scope.place.name = res.name;
                $scope.place.lat = res.geometry.location.lat();
                $scope.place.lng = res.geometry.location.lng();
                			 
                console.log($scope.showPickUp);
                if(!$scope.showPickUp){
                	$scope.placePickUp = res;
                    Map.addMarker($scope.placePickUp);
                }else{
                	$scope.placeDestination = res;
                	Map.addMarker($scope.placeDestination);
                }
                			 
            },function(status) { // error
               	$scope.apiError = true;
                $scope.apiStatus = status;
            });
    	}


    	$scope.searchForPickUp = function(){
    		
            if($scope.pickUpPress == true){

                $scope.error = "A pick up location has already been added, please press change location button first in order to change the pick up location";
                $('#error')
                    .modal('show');

            }else if($scope.searchPickUp == ""){
                $scope.error = "Please enter a pick up location first"
                    $('#error')
                    .modal('show');
            }else{
                
                $scope.searchPlace = $scope.searchPickUp;
                $scope.search();
                $scope.showPickUp = false;
                $scope.showDestination = true;
                $scope.pickUpPress = true;
            }
    	} 

    	$scope.searchForDestination = function(){
    		
            if($scope.searchPickUp == ""){
                $scope.error = "Please enter a pick up location first"
                $('#error')
                    .modal('show');

            }else if($scope.searchDestination == ""){
                $scope.error = "Please enter a destination location first"
                $('#error')
                    .modal('show');

            }else if($scope.destinationPress == true){

                $scope.error = "A destination locaton has already been added, please press change location button first in order to change the destination location";
                $('#error')
                    .modal('show');
            }else{

                $scope.searchPlace = $scope.searchDestination;
                $scope.search();
                $scope.showPickUp = true;
                $scope.showQuote = true;

                if($scope.searchPickUp != "" && $scope.searchDestination != ""){

                 $scope.showSearch = false;
                }

                $scope.destinationPress = true;
            }
    	} 


    	GeolocationService().then(function (position) {
        	$scope.position = position;
        	$scope.lat = $scope.position.coords.latitude;
    		$scope.lng = $scope.position.coords.longitude;
        	Map.init($scope.lat, $scope.lng);
    	}, function (reason) {
        	return "Could not be determined."
    	});

    	$scope.getDistance = function(){

    		if($scope.pickUpPress == false || $scope.destinationPress == false){

                $scope.error = "Please add the locations first before you can be quoted (Press add button)"
                $('#error')
                    .modal('show');
            }else{

                var address1 = $scope.placePickUp.geometry.location.lat().toString() + "," + $scope.placePickUp.geometry.location.lng().toString();
                var address2 = $scope.placeDestination.geometry.location.lat().toString() + "," + $scope.placeDestination.geometry.location.lng().toString();
                var addresses = {address1 : address1, address2 : address2 };

                $http.post('/getDistance', addresses).then(function(res){

                    $scope.distance = res.data;
                    $scope.totalDistance = $scope.distance.rows[0].elements[0].distance.text;
                    $scope.time = $scope.distance.rows[0].elements[0].duration.text;

                    console.log($scope.distance);
                });
                
                $('#quote-modal')
                    .modal('show');

                $scope.pickUpPress = false;
                $scope.destinationPress = false;
                //$scope.changeLocation();
            }
    	};


    	$scope.changeLocation = function(){

    		if(!$scope.showSearch){

    			$scope.showSearch = true;
    		}

    		$scope.searchPickUp = "";
    		$scope.searchDestination = "";

    		$scope.placePickUp = {};
    		$scope.placeDestination = {};

    		$scope.showSearch = true;
    		$scope.showQuote = false;
            $scope.showDestination = false;

    		GeolocationService().then(function (position) {
        		$scope.position = position;
        		$scope.lat = $scope.position.coords.latitude;
    			$scope.lng = $scope.position.coords.longitude;
        		Map.init($scope.lat, $scope.lng);
    		}, function (reason) {
        		return "Could not be determined."
    		});

    	};
	});


})();