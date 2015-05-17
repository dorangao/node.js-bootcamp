angular.module('social-feed', ['ngRoute'])
  .factory('posts', ['$http', '$route', function ($http, $route) {

    var o = {};
    o.deletePost = function (postid) {
      return $http.post('/delete/' + postid).then(function (res) {
        window.location.reload(true);
      });
    };

    return o;
  }]).controller('PostCtrl', ['$scope', 'posts',
    function ($scope, posts) {

      $scope.deletePost = posts.deletePost;

    }]);