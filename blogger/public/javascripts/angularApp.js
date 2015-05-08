var app = angular.module('bloggerSky', ['ui.router']);

app.config([
  '$stateProvider',
  '$urlRouterProvider',
  function ($stateProvider, $urlRouterProvider) {
    $stateProvider
      .state('home', {
        url: '/home',
        templateUrl: 'partials/home.html',
        controller: 'MainCtrl',
        resolve: {
          postPromise: ['posts', function (posts) {
            return posts.getAll();
          }]
        }
      })
      .state('posts', {
        url: '/posts/{id}',
        templateUrl: 'partials/posts.html',
        controller: 'PostsCtrl',
        resolve: {
          post: ['$stateParams', 'posts', function ($stateParams, posts) {
            return posts.get($stateParams.id);
          }]
        }
      }).state('login', {
        url: '/login',
        templateUrl: 'partials/login.html',
        controller: 'AuthCtrl',
        onEnter: ['$state', 'auth', function ($state, auth) {
          if (auth.isLoggedIn()) {
            $state.go('home');
          }
        }]
      })
      .state('register', {
        url: '/register',
        templateUrl: 'partials/register.html',
        controller: 'AuthCtrl',
        onEnter: ['$state', 'auth', function ($state, auth) {
          if (auth.isLoggedIn()) {
            $state.go('home');
          }
        }]
      });

    $urlRouterProvider.otherwise('home');
  }]);

app.factory('auth', ['$http', '$window', function ($http, $window) {
  var auth = {};

  auth.saveToken = function (token) {
    $window.localStorage['flapper-news-token'] = JSON.stringify(token);
  };

  auth.getToken = function () {
    return $window.localStorage['flapper-news-token'] || false;
    };

  auth.isLoggedIn = function () {
    var token = auth.getToken();

    if (token) {
      var payload = JSON.parse($window.atob(token.split('.')[1]));
      return payload.exp > Date.now() / 1000;
    } else {
      return false;
    }
  };

  auth.currentUser = function () {
    if (auth.isLoggedIn()) {
      var token = auth.getToken();
      var payload = JSON.parse($window.atob(token.split('.')[1]));

      return payload.username;
    }
  };

  auth.register = function (user) {
    return $http.post('/register', user).success(function (data) {
      auth.saveToken(data.token);
    });
  };
  auth.logIn = function (user) {
    return $http.post('/login', user).success(function (data) {
      auth.saveToken(data.token);
    });
  };

  auth.logOut = function () {
    $window.localStorage.removeItem('flapper-news-token');
  };

  return auth;

}]).factory('posts', ['$http', 'auth', function ($http, auth) {
  var o = {
    posts: []
  };

  var config = {
    headers: {Authorization: 'Bearer ' + auth.getToken()}
  }

  o.getAll = function () {
    return $http.get('/posts').success(function (data) {
      angular.copy(data, o.posts);
    });
  };

  o.get = function (id) {
    return $http.get('/posts/' + id).then(function (res) {
      return res.data;
    });
  };


  o.create = function (post) {
    return $http.post('/posts', post, config).success(function (data) {
      o.posts.push(data);
    });
  };

  o.upvote = function (post) {
    return $http.put('/posts/' + post._id + '/upvote', null, config)
      .success(function (data) {
        post.upvotes += 1;
      });
  };

  o.addComment = function (id, comment) {
    return $http.post('/posts/' + id + '/comments', comment, config);
  };

  o.upvoteComment = function (post, comment) {
    return $http.put('/posts/' + post._id + '/comments/' + comment._id + '/upvote', null, config)
      .success(function (data) {
        comment.upvotes += 1;
      });
  };

  return o;
}]);

app.controller('MainCtrl', ['$scope', '$stateParams', 'posts','auth',
  function ($scope, $stateParams, posts, auth) {
    $scope.isLoggedIn = auth.isLoggedIn;

    $scope.posts = posts.posts;

    $scope.addPost = function () {
      if (!$scope.title || $scope.title === '') {
        return;
      }
      posts.create({
        title: $scope.title,
        link: $scope.link
      });
      $scope.title = '';
      $scope.link = '';
    };

    $scope.incrementUpvotes = function (post) {
      posts.upvote(post);
    };

  }]);

app.controller('PostsCtrl', [
  '$scope',
  'posts',
  'post',
  'auth',
  function ($scope, posts, post,auth) {

    $scope.post = post;

    $scope.isLoggedIn = auth.isLoggedIn;

    $scope.addComment = function () {
      if ($scope.body === '') {
        return;
      }
      posts.addComment(post._id, {
        body: $scope.body,
        author: 'user'
      }).success(function (comment) {
        $scope.post.comments.push(comment);
      });
      $scope.body = '';
    };

    $scope.incrementUpvotes = function (comment) {
      posts.upvoteComment(post, comment);
    };


  }]);

app.controller('AuthCtrl', [
  '$scope',
  '$state',
  'auth',
  function ($scope, $state, auth) {
    $scope.user = {};

    $scope.register = function () {
      auth.register($scope.user).error(function (error) {
        $scope.error = error;
      }).then(function () {
        $state.go('home');
      });
    };

    $scope.logIn = function () {
      auth.logIn($scope.user).error(function (error) {
        $scope.error = error;
      }).then(function () {
        $state.go('home');
      });
    };
  }]);

app.controller('NavCtrl', [
  '$scope',
  'auth',
  function ($scope, auth) {
    $scope.isLoggedIn = auth.isLoggedIn;
    $scope.currentUser = auth.currentUser;
    $scope.logOut = auth.logOut;
  }]);