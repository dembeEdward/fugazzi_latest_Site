(function() {

    'use strict';

    var app = angular.module("fugazzi", ['ui.router', 'auth0', 'angular-storage', 'angular-jwt', 'ui.map', 'ui.event','ngSanitize', 'MassAutoComplete']);

    app.config(function($stateProvider, $urlRouterProvider, authProvider) {

        $urlRouterProvider.otherwise('/');

        $stateProvider
            .state('login', {
                url: '/',
                templateUrl: '../templates/login.html',
                controller: 'loginCtrl'
            })
            .state('home', {
                url: '/home',
                templateUrl: '../templates/home.html',
                controller: 'homepageCtrl'
            })
            .state('items',{
                url: '/items',
                templateUrl: '../templates/items.html',
                controller: 'itemsCtrl'
            });

        authProvider.init({
            domain: 'fugazzi.auth0.com',
            clientID: 'XUfJmQqde9MB9Y5JezxpptospCG34clu'
        });
    });

    app.run(function(auth) {

        auth.hookEvents();
    });

    app.factory("GeolocationService", function($q, $window, $rootScope) {
        return function() {
            var deferred = $q.defer();

            if (!$window.navigator) {
                $rootScope.$apply(function() {
                    deferred.reject(new Error("Geolocation is not supported"));
                });
            } else {
                $window.navigator.geolocation.getCurrentPosition(function(position) {
                    $rootScope.$apply(function() {
                        deferred.resolve(position);
                    });
                }, function(error) {
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
            this.places.textSearch({
                query: str
            }, function(results, status) {
                if (status == 'OK') {
                    d.resolve(results[0]);
                } else d.reject(status);
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
            require: 'ngModel',
            link: function(scope, element, attrs, model) {
                var options = {
                    types: [],
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

    app.service('login', function(auth, store, $location){


        this.signin = function(){

            auth.signin({}, function(profile, token){

            store.set('profile', profile);
            store.set('token', token);
            $location.path('/home');

            }, function(){});
        };
    });

    app.service('showCarousel', function(){


        this.show = false;

    });

    app.service('goHome', function($state, store, login){

        this.goToHome = function(){

            this.profile = store.get('profile');

            if(!this.profile){

                login.signin();
            }else{

                $state.go('home');
            }
        };
    });

    app.service('logout', function($location, auth, store){

        this.signout = function(){

            auth.signout();
            $location.path('/');
            store.remove('profile');
            store.remove('token');
            store.remove('time');
            store.remove('totalDistance');
            store.remove('pickUp');
            store.remove('destination');
        };
    });


    app.controller("loginCtrl", function($scope, $http, login, store, showCarousel, goHome) {

        $scope.login = function() {
            login.signin();
        }

        $scope.showOptions = function() {

            $('.modal.fade')
                .modal('show');
        };


        $('#simple-menu').sidr();

        $scope.goToHome = function(){

            goHome.goToHome();
        };

    });

    app.controller("homepageCtrl", function($scope, GeolocationService, Map, $http, store, auth, $location, logout, $timeout) {

        $scope.lat = "0";
        $scope.lng = "0";
        $scope.accuracy = "0";
        $scope.error = "";
        $scope.model = {
            myMap: undefined
        };
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
        $scope.userProfile = store.get("profile");
        $scope.addPickUpLocation = false;
        $scope.addDestinationLocation = false;
        $scope.addLocationButton = true;
        $scope.allItems = [];

        console.log($scope.userProfile);

        $('#simple-menu').sidr();
        $('.carousel').carousel();

        $scope.search = function() {

            $scope.apiError = false;
            Map.search($scope.searchPlace).then(function(res) { // success
                Map.addMarker(res);
                $scope.place.name = res.name;
                $scope.place.lat = res.geometry.location.lat();
                $scope.place.lng = res.geometry.location.lng();

                console.log($scope.place);
                if (!$scope.showPickUp) {
                    $scope.placePickUp = res;
                    Map.addMarker($scope.placePickUp);
                } else {
                    $scope.placeDestination = res;
                    Map.addMarker($scope.placeDestination);
                }

            }, function(status) { // error
                $scope.apiError = true;
                $scope.apiStatus = status;
            });
        }


        $scope.searchForPickUp = function() {

            if ($scope.searchPickUp == "") {
                $scope.error = "Please enter a pick up location first"
                $('#error')
                    .modal('show');
            } else {

                $scope.searchPlace = $scope.searchPickUp;
                $scope.search();
                $scope.showPickUp = false;
                $scope.showDestination = true;
                $scope.pickUpPress = true;
                $scope.addPickUpLocation = false;
                $scope.addDestinationLocation = true;
            }
        };

        $scope.searchForDestination = function() {

            if ($scope.searchPickUp == "") {
                $scope.error = "Please enter a pick up location first"
                $('#error')
                    .modal('show');

            } else if ($scope.searchDestination == "") {
                $scope.error = "Please enter a destination location first"
                $('#error')
                    .modal('show');
            } else {

                $scope.searchPlace = $scope.searchDestination;
                $scope.search();
                $scope.showPickUp = true;
                $scope.showQuote = true;
                $scope.addDestinationLocation = false;

                if ($scope.searchPickUp != "" && $scope.searchDestination != "") {

                    $scope.showSearch = false;
                }

                $scope.destinationPress = true;
            }
        };


        GeolocationService().then(function(position) {
            $scope.position = position;
            $scope.lat = $scope.position.coords.latitude;
            $scope.lng = $scope.position.coords.longitude;
            Map.init($scope.lat, $scope.lng);
            console.log($scope.position);
        }, function(reason) {
            return "Could not be determined."
        });

        $scope.getDistance = function() {

            if ($scope.pickUpPress == false || $scope.destinationPress == false) {

                $scope.error = "Please choose another location (Press location button)"
                $('#error')
                    .modal('show');
            } else {

                var address1 = $scope.placePickUp.geometry.location.lat().toString() + "," + $scope.placePickUp.geometry.location.lng().toString();
                var address2 = $scope.placeDestination.geometry.location.lat().toString() + "," + $scope.placeDestination.geometry.location.lng().toString();
                var addresses = {
                    address1: address1,
                    address2: address2
                };

                console.log(addresses);
                $http.post('/getDistance', addresses).then(function(res) {

                    $scope.distance = res.data;
                    $scope.totalDistance = $scope.distance.rows[0].elements[0].distance.text;
                    $scope.time = $scope.distance.rows[0].elements[0].duration.text;

                    store.set('totalDistance', $scope.totalDistance);
                    store.set('time', $scope.time);
                    store.set('pickUp', $scope.searchPickUp);
                    store.set('destination', $scope.searchDestination);
                    console.log($scope.distance);
                });

                $scope.pickUpPress = false;
                $scope.destinationPress = false;

                $timeout(callAlert, 1000);

                function callAlert(){

                    $location.path('/items');
                }
            }
        };

        $scope.changeLocation = function() {

            if (!$scope.showSearch) {

                $scope.showSearch = true;
            }

            $scope.searchPickUp = "";
            $scope.searchDestination = "";

            $scope.placePickUp = {};
            $scope.placeDestination = {};

            $scope.showSearch = true;
            $scope.showQuote = false;
            $scope.showDestination = false;
            $scope.addPickUpLocation = true;

            GeolocationService().then(function(position) {
                $scope.position = position;
                $scope.lat = $scope.position.coords.latitude;
                $scope.lng = $scope.position.coords.longitude;
                Map.init($scope.lat, $scope.lng);
            }, function(reason) {
                return "Could not be determined."
            });

        };

        $scope.showAddLocation = function() {

            $scope.addPickUpLocation = true;
            $scope.addLocationButton = false;
        };

        $scope.getItems = function(){

            $('#quote-modal')
                .modal('hide');

            $location.path('/items');
        };

        $scope.logout = function() {

            logout.signout();
            $scope.profile = {};
            $scope.allItems = [];
        };
    });

    app.controller('itemsCtrl', function($scope, store, auth, logout, $http, $sce, $q){

        $scope.allItems = [];
        $scope.prices = [];
        $scope.totalPrice = 0;
        $scope.dirty = {};
        $scope.pickUp = "";

        $scope.showFinish = false;
        $scope.showAdd = true;
        $scope.showTotalPrice = false;

        $('#simple-menu').sidr();

        $scope.userProfile = store.get('profile');
        $scope.allItems = store.get('allItems');
        $scope.pickUp = store.get('pickUp');
        $scope.destination = store.get('destination');
        $scope.time = store.get('time');
        $scope.kms = store.get('totalDistance');

        console.log($scope.pickUp);


        if(!$scope.allItems){

            $http.get('/getAllItems').then(function(response){

                console.log(response.data);
                store.set('allItems', response.data);
                $scope.allItems = store.get('allItems');
            });
        }

        if(!$scope.pickUp){

            $scope.pickUp = store.get('pickUp');
            $scope.destination = store.get('destination');
            $scope.time = store.get('time');
            $scope.kms = store.get('totalDistance');

        }
            //console.log($scope.allItems[0]);
        function suggest_state(term) {

            var q = term.toLowerCase().trim();
            var results = [];

            for (var i = 0; i < $scope.allItems.length && results.length < 10; i++) {

                var item = $scope.allItems[i].Item;

                if (item.toLowerCase().indexOf(q) === 0)
                    results.push({ label: item, value: item });
            }

            return results;
        }

        $scope.autocomplete_options = {
            suggest: suggest_state
        };

        $scope.buscket = [];

        $scope.addToBuscket = function(){

            $scope.fail = false;
            $scope.showFail = false;
            $scope.showTotalPrice = false;

            for(var x=0; x<$scope.buscket.length; x++){

                if($scope.dirty.value == $scope.buscket[x].Item){

                    $scope.fail = true;
                    break;
                }
            }

            console.log($scope.fail);

            if($scope.fail){

                $scope.showFail = true;

            }else{

                for(var x=0; x<$scope.allItems.length; x++){

                    if($scope.dirty.value == $scope.allItems[x].Item){

                        $scope.buscket.push($scope.allItems[x]);
                        break;
                    }
                }

                $scope.dirty.value = "";

                if($scope.buscket.length > 0){
                    $scope.showFinish = true;
                }else{
                    $scope.showFinish = false;
                }
                if($scope.buscket.length == 10){
                    $scope.showAdd = false;
                }else{
                    $scope.showAdd = true;
                }
                //console.log($scope.buscket[0]);
            }
        };

        $scope.removeFromBuscket = function(index){

            $scope.showFail = false;
            $scope.showTotalPrice = false;

            $scope.buscket.splice(index, 1);

            if($scope.buscket.length > 0){
                $scope.showFinish = true;
            }else{
                $scope.showFinish = false;
            }

            if($scope.buscket.length == 10){
                $scope.showAdd = false;
            }else{
                $scope.showAdd = true;
            }
        };

        $scope.getPrices = function(){

            $http.get('/getPrices').then(function(response){

                console.log(response.data[0]);
                console.log(response.data[0]["category rate"]);

                for(var x=0; x<response.data.length; x++){

                    $scope.prices[x] = {rate : (response.data[x].field2/100), category: response.data[x].category};
                    //$scope.prices[x] = {rate : (response.data[x]["category rate"]), category: response.data[x].category};
                }

                store.set('prices', $scope.prices);
                console.log($scope.prices);
            });

        };

        $scope.getPrices();

        $scope.calculatePrice = function(){

            $scope.showFail = false;
            $scope.discountRate = 0;
            $scope.currentPrice = 0;
            $scope.totalPriceRate = 0;

            console.log($scope.buscket);

            if(!store.get('prices')){


                $scope.prices = store.get('prices');
                console.log($scope.prices);
            }else{


                $scope.prices = store.get('prices');
                console.log($scope.prices);
            }

            if(parseInt(store.get('totalDistance')) <= 10){
                    $scope.discountRate = 1;
                    console.log($scope.discountRate);
                }else if(parseInt(store.get('totalDistance')) > 10 && parseInt(store.get('totalDistance')) <= 20){
                    $scope.discountRate = 0.8;
                    console.log($scope.discountRate);
                }else if(parseInt(store.get('totalDistance')) > 20 && parseInt(store.get('totalDistance')) <= 30){
                    $scope.discountRate = 0.75;
                    console.log($scope.discountRate);
                }else if(parseInt(store.get('totalDistance')) > 30 && parseInt(store.get('totalDistance') )<= 40){
                    $scope.discountRate = 0.65;
                    console.log($scope.discountRate);
                }else{
                    $scope.discountRate = 0.6;
                    console.log($scope.discountRate);
                }


            for(var x=0; x<$scope.buscket.length; x++){

                $scope.priceRate = 0;

                console.log("busket item name: " + $scope.buscket[x].Item);
                console.log("busket item category : " + $scope.buscket[x].Category);

                for(var y=0; y<$scope.prices.length; y++){

                    if($scope.buscket[x].Category == $scope.prices[y].category){

                        $scope.priceRate = $scope.prices[y].rate;
                        $scope.totalPriceRate = $scope.totalPriceRate + $scope.prices[y].rate;
                        break;
                    }

                }
            }
            console.log("Current Total Price Rate: " + $scope.totalPriceRate);

            $scope.totalPrice = ((parseFloat(store.get('totalDistance')  )*  5 * ($scope.totalPriceRate + $scope.buscket.length) * ($scope.discountRate * $scope.buscket.length))/($scope.discountRate * $scope.buscket.length));
            $scope.showTotalPrice = true;
            $scope.itemsNo = $scope.buscket.length;

            console.log($scope.totalPrice);
        };

        $scope.logout = function() {

            logout.signout();
            $scope.profile = {};
            $scope.allItems = [];
        };
    });

})();
