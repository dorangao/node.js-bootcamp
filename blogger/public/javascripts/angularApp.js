var app = angular.module('bloggerSky', ['ui.router', 'ngFileUpload', 'xeditable']);

app.run(function(editableOptions) {
  editableOptions.theme = 'bs3'; // bootstrap3 theme. Can be also 'bs2', 'default'
});
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
          postPromise: ['auth', 'posts', function (auth, posts) {
            return auth.getAllUsers() && posts.getAll();
          }]
        }
      })
      .state('admin', {
        url: '/admin',
        templateUrl: 'partials/admin.html',
        controller: 'AdminCtrl',
        resolve: {
          postPromise: ['auth', 'posts', function (auth, posts) {
            return posts.getAll(auth.currentUser());
          }]
        }
      })
      .state('blog', {
        url: '/blogs/{username}',
        templateUrl: 'partials/blog.html',
        controller: 'BlogCtrl',
        resolve: {
          postPromise: ['$stateParams', 'posts', function ($stateParams, posts) {
            return posts.getAll($stateParams.username);
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

app.factory('auth', ['$http', '$window', 'Upload', function ($http, $window, Upload) {
  var auth = {users: []};

  auth.saveToken = function (token) {
    $window.localStorage['bloggersky-token'] = token;
  };

  auth.getToken = function () {
    return $window.localStorage['bloggersky-token'] || false;
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
    $window.localStorage.removeItem('bloggersky-token');
  };

  auth.getAllUsers = function () {
    return $http.get('/users').success(function (data) {
      angular.copy(data, auth.users);
    });
  };

  return auth;

}]).factory('posts', ['$http', 'auth', 'Upload', function ($http, auth, Upload) {
  var o = {
    posts: []
  };

  var config = {
    headers: {Authorization: 'Bearer ' + auth.getToken()}
  };

  o.getAll = function (username) {
    return $http.get('/posts', {params: {username: username}}).success(function (data) {
      angular.copy(data, o.posts);
    });
  };

  o.get = function (id) {
    return $http.get('/posts/' + id).then(function (res) {
      return res.data;
    });
  };


  o.create = function (post) {
    return $http.post('/posts', post.post, config).success(function (data) {
      var files = post.files;
      if (files && files.length) {
        for (var i = 0; i < files.length; i++) {
          var file = files[i];
          console.log(file);
          Upload.upload({
            url: '/posts/' + data._id + '/images',
            headers: config.headers,
            file: file
          }).success(function (newdata, status, headers, cfg) {
            o.posts.push(newdata);
          });
        }
      } else {
        o.posts.push(data);
      }
    });
  };

  o.uploadImages = function (post, files) {

  };

  o.upvote = function (post) {
    return $http.put('/posts/' + post._id + '/upvote', null, config)
      .success(function (data) {
        post.upvotes += 1;
      });
  };

  o.updatePost = function (post, newpost) {
    var index = o.posts.indexOf(post);
    o.posts.splice(index, 1);
    return $http.put('/posts/' + post._id, newpost, config)
      .success(function (data) {
        o.posts.push(data);
      });
  };

  o.deletePost = function (post) {
    return $http.delete('/posts/' + post._id, config)
      .success(function (data) {
        var index = o.posts.indexOf(post);
        o.posts.splice(index, 1);
      });
  };

  o.addComment = function (id, comment) {
    return $http.post('/posts/' + id + '/comments', comment, config);
  };

  o.updateComment = function (comment, newcomment) {
    return $http.put('/comments/' + comment._id, newcomment, config)
      .success(function (data) {
        return data;
      });
  };

  o.deleteComment = function (comment) {
    return $http.delete('/comments/' + comment._id, config)
      .success(function (data) {
      });
  };

  o.upvoteComment = function (post, comment) {
    return $http.put('/posts/' + post._id + '/comments/' + comment._id + '/upvote', null, config)
      .success(function (data) {
        comment.upvotes += 1;
      });
  };

  return o;
}]);

app.controller('MainCtrl', ['$scope', '$stateParams', 'posts', 'auth', 'Upload',
  function ($scope, $stateParams, posts, auth, Upload) {
    $scope.isLoggedIn = auth.isLoggedIn;

    $scope.posts = posts.posts;
    $scope.users = auth.users;
    $scope.post = {};
    $scope.files = [];
    $scope.addPost = function () {
      if (!$scope.post.title || $scope.post.title === '') {
        return;
      }
      posts.create({post: $scope.post, files: $scope.files});

      $scope.post = {};
      $scope.files = [];
    };

    $scope.incrementUpvotes = function (post) {
      posts.upvote(post);
    };
  }]);

app.controller('AdminCtrl', ['$scope', '$stateParams', 'posts', 'auth', 'Upload',
  function ($scope, $stateParams, posts, auth, Upload) {
    $scope.isLoggedIn = auth.isLoggedIn;

    $scope.posts = posts.posts;
    $scope.newpost = {};
    $scope.post = {};
    $scope.isUpdate = false;

    $scope.files = [];
    $scope.addPost = function () {
      if (!$scope.newpost.title || $scope.newpost.title === '') {
        return;
      }
      posts.create({post: $scope.newpost, files: $scope.files});

      $scope.newpost = {};
      $scope.files = [];
    };


    $scope.enterEditMode = function (post) {
      $scope.isUpdate = true;
      $scope.post = post;
      $scope.newpost.title = post.title;
      $scope.newpost.content = post.content;
    }

    $scope.isPostChanged = function () {
      return ($scope.newpost.title !== $scope.post.title || $scope.newpost.content !== $scope.post.content);
    };

    $scope.updatePost = function () {

      posts.updatePost($scope.post, $scope.newpost).success(function (post) {
        $scope.isUpdate = false;
        $scope.newpost = {};
        $scope.post = {};
      });
    };

    $scope.deletePost = function (post) {
      posts.deletePost(post).success(function (post) {
      });
    };

    $scope.incrementUpvotes = function (post) {
      posts.upvote(post);
    };
  }]);


app.controller('BlogCtrl', ['$scope', '$stateParams', 'posts', 'auth',
  function ($scope, $stateParams, posts, auth) {
    $scope.isLoggedIn = auth.isLoggedIn;

    $scope.posts = posts.posts;

    $scope.blogName = $stateParams.username;

  }]);


app.controller('PostsCtrl', [
  '$scope',
  'posts',
  'post',
  'auth',
  function ($scope, posts, post, auth) {

    $scope.post = post;
    $scope.isLoggedIn = auth.isLoggedIn;
    $scope.currentUser = auth.currentUser;

    $scope.comments = post.comments;

    $scope.comment={};
    $scope.newcomment = {};
    $scope.isUpdate = false;

    $scope.enterCommentEditMode = function (comment) {
      $scope.isUpdate = true;
      $scope.comment = comment;
      $scope.newcomment.body = comment.body;
    }
    $scope.addComment = function () {
      if ($scope.body === '') {
        return;
      }
      posts.addComment(post._id, {
        body: $scope.newcomment.body
      }).success(function (comment) {
        $scope.post.comments.push(comment);
      });
      $scope.newcomment = {};
    };
    $scope.isCommentChanged = function () {
      return ($scope.newcomment.body !== $scope.comment.body);
    };

    $scope.updateComment = function () {
      posts.updateComment($scope.comment, $scope.newcomment).success(function (updatedcomment) {
        $scope.isUpdate = false;
        var index = $scope.post.comments.indexOf($scope.comment);
        $scope.post.comments.splice(index, 1);
        $scope.post.comments.push(updatedcomment);
        $scope.newcomment = {};
        $scope.comment = {};
      });
    };

    $scope.deleteComment = function (comment) {
      posts.deleteComment(comment).success(function (res) {
        var index = $scope.post.comments.indexOf(comment);
        $scope.post.comments.splice(index, 1);
      });
    };
    $scope.incrementUpvotes = function (comment) {
      posts.upvoteComment(post, comment);
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
        $state.go('admin');
      });
    };

    $scope.logIn = function () {
      auth.logIn($scope.user).error(function (error) {
        $scope.error = error;
      }).then(function () {
        $state.go('admin');
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