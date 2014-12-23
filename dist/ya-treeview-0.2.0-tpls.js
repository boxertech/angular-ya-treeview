(function(exports, global) {
    global["true"] = exports;
    "use strict";
    angular.module("ya.treeview", []).factory("YaTreeviewService", [ "$q", function($q) {
        var service = {};
        var hasChildren = function(node, options) {
            return angular.isArray(node[options.childrenKey]) || node[options.hasChildrenKey] || false;
        };
        service.children = function(node, options) {
            var deferred = $q.defer();
            var children = node.$model[options.childrenKey];
            if (angular.isFunction(children)) {
                $q.when(children()).then(function(children) {
                    deferred.resolve(children);
                });
            } else if (angular.isArray(children)) {
                deferred.resolve(children);
            } else {
                deferred.reject(new Error("Children is neither an array nor a function."));
            }
            return deferred.promise;
        };
        service.nodify = function(node, parent, options) {
            var deferred = $q.defer();
            var vnode = {
                $model: node,
                $parent: parent,
                $hasChildren: hasChildren(node, options),
                collapsed: !options.expanded
            };
            if (vnode.$hasChildren) {
                if (options.expanded) {
                    $q.when(service.children(vnode, options)).then(function(children) {
                        service.nodifyArray(children, vnode, options).then(function(returnChildren) {
                            vnode.$children = returnChildren;
                            deferred.resolve(vnode);
                        });
                    });
                } else {
                    vnode.$children = [];
                    deferred.resolve(vnode);
                }
            } else {
                deferred.resolve(vnode);
            }
            return deferred.promise;
        };
        service.nodifyArray = function(nodes, parent, options) {
            var deferred = $q.defer();
            var nodePromises = [];
            var vnodes = [];
            angular.forEach(nodes, function(node) {
                var nodeDeferred = $q.defer();
                service.nodify(node, parent, options).then(function(returnNode) {
                    vnodes.push(returnNode);
                    nodeDeferred.resolve();
                });
                nodePromises.push(nodeDeferred);
            });
            $q.all(nodePromises).then(function() {
                deferred.resolve(vnodes);
            });
            return deferred.promise;
        };
        return service;
    } ]).controller("YaTreeviewCtrl", [ "$scope", "$timeout", "YaTreeviewService", "$q", function($scope, $timeout, YaTreeviewService, $q) {
        var options;
        var fillOptions = function(clientOptions) {
            var options = {};
            clientOptions = clientOptions || {};
            options.childrenKey = clientOptions.childrenKey || "children";
            options.hasChildrenKey = clientOptions.hasChildrenKey || "has_children";
            options.onExpand = clientOptions.onExpand || angular.noop;
            options.onCollapse = clientOptions.onCollapse || angular.noop;
            options.onSelect = clientOptions.onSelect || angular.noop;
            options.onDblClick = clientOptions.onDblClick || angular.noop;
            options.expanded = !!clientOptions.expanded;
            return options;
        };
        var fillChildrenNodes = function(node, value) {
            var deferred = $q.defer();
            if (node.$hasChildren) {
                $timeout(function() {
                    angular.forEach(node.$children, function(node) {
                        if (node.$hasChildren) {
                            $q.when(YaTreeviewService.children(node, options)).then(function(children) {
                                node.$children = value || YaTreeviewService.nodifyArray(children, node, options);
                                deferred.resolve();
                            });
                        }
                    });
                });
            }
            return deferred.promise;
        };
        var createRootNode = function(nodes) {
            var deferred = $q.defer();
            var node = {};
            node[options.childrenKey] = nodes;
            YaTreeviewService.nodify(node, null, options).then(function(returnNode) {
                console.log("in createRootNode nodify response");
                var root = returnNode;
                YaTreeviewService.nodifyArray(nodes, root, options).then(function(children) {
                    console.log("in createRootNode nodifyArray response");
                    root.$children = children;
                    fillChildrenNodes(root).then(function() {
                        root.collapsed = false;
                        deferred.resolve(root);
                    });
                });
            });
            return deferred.promise;
        };
        $scope.init = function() {
            var deferred = $q.defer();
            options = fillOptions($scope.options);
            options.expanded = false;
            createRootNode($scope.model).then(function(rootNode) {
                console.log("rootNode: ");
                console.log(rootNode);
                $scope.node = rootNode;
                $scope.context = $scope.context || {};
                $scope.context.rootNode = $scope.node;
                $scope.context.nodify = contextNodify;
                $scope.context.nodifyArray = contextNodifyArray;
                $scope.context.children = contextChildren;
                deferred.resolve();
            });
            return deferred.promise;
        };
        $scope.toggle = function($event, node) {
            if (node.collapsed) {
                $scope.expand($event, node);
            } else {
                $scope.collapse($event, node);
            }
        };
        $scope.expand = function($event, node) {
            var deferred = $q.defer();
            fillChildrenNodes(node).then(function() {
                node.collapsed = false;
                options.onExpand($event, node, $scope.context);
                deferred.resolve();
            });
            return deferred.promise;
        };
        $scope.collapse = function($event, node) {
            node.collapsed = true;
            fillChildrenNodes(node, []);
            angular.forEach(node.$children, function(child) {
                child.collapsed = true;
            });
            options.onCollapse($event, node, $scope.context);
        };
        $scope.selectNode = function($event, node) {
            $scope.context.selectedNode = node;
            options.onSelect($event, node, $scope.context);
        };
        $scope.dblClick = function($event, node) {
            options.onDblClick($event, node, $scope.context);
        };
        var contextNodify = function(node, parent) {
            var deferred = $q.defer();
            YaTreeviewService.nodify(node, parent, options).then(function(returnNode) {
                deferred.resolve(returnNode);
            });
            return deferred.promise;
        };
        var contextNodifyArray = function(nodes, parent) {
            var deferred = $q.defer();
            YaTreeviewService.nodifyArray(nodes, parent, options).then(function(returnNodes) {
                deferred.resolve(returnNodes);
            });
            return deferred.promise;
        };
        var contextChildren = function(node) {
            var deferred = $q.defer();
            YaTreeviewService.children(node, options).then(function(returnChildren) {
                deferred.resolve(returnChildren);
            });
            return deferred.promise;
        };
        $scope.$watch("model", function(newValue, oldValue) {
            if (newValue !== oldValue) {
                $scope.node = createRootNode(newValue);
            }
        });
        $scope.$watch("context.selectedNode", function(node) {
            $scope.selectNode({}, node);
        });
        $scope.init();
    } ]).directive("yaTreeview", function() {
        return {
            restrict: "AE",
            replace: true,
            transclude: true,
            controller: "YaTreeviewCtrl",
            scope: {
                id: "@yaId",
                model: "=yaModel",
                options: "=yaOptions",
                context: "=yaContext"
            },
            templateUrl: "templates/ya-treeview/treeview.tpl.html",
            compile: function(tElement, tAttrs, tTranscludeFn) {
                return function(scope, iElement, iAttrs, treeviewCtrl) {
                    treeviewCtrl.transcludeFn = tTranscludeFn;
                };
            }
        };
    }).directive("yaNode", [ "$compile", function($compile) {
        return {
            restrict: "AE",
            replace: false,
            scope: false,
            templateUrl: "templates/ya-treeview/children.tpl.html",
            compile: function(tElement) {
                var template = tElement.clone();
                tElement.empty();
                return function(scope, iElement) {
                    if (scope.node.$hasChildren) {
                        iElement.append($compile(template.html())(scope));
                    }
                };
            }
        };
    } ]).directive("yaTransclude", function() {
        return {
            restrict: "AE",
            replace: false,
            require: "^yaTreeview",
            scope: false,
            template: "",
            link: function(scope, iElement, iAttrs, treeviewCtrl) {
                treeviewCtrl.transcludeFn(scope, function(clone) {
                    if (scope.node) {
                        iElement.append(clone);
                    }
                });
            }
        };
    });
    angular.module("ya.treeview.tpls", [ "templates/ya-treeview/children.tpl.html", "templates/ya-treeview/treeview.tpl.html" ]);
    angular.module("templates/ya-treeview/children.tpl.html", []).run([ "$templateCache", function($templateCache) {
        $templateCache.put("templates/ya-treeview/children.tpl.html", '<ul ng-hide=node.collapsed><li class=node ng-repeat="node in node.$children"><div ng-show=node.$hasChildren><a ng-show=node.collapsed class="btn btn-link pull-left" ng-click="expand($event, node)"><svg id=svgtest viewbox="0 0 20 20" class=shape><use xlink:href=#shape-collapse-right></use></svg></a> <a ng-hide=node.collapsed class="btn btn-link pull-left" ng-click="collapse($event, node)"><svg id=svgtest viewbox="0 0 20 20" class=shape><use xlink:href=#shape-collapse-down></use></svg></a></div><div class=node-content ya-transclude ng-click="selectNode($event, node)" ng-dblclick="dblClick($event, node)"></div><div ya-node class=ya-node></div></li></ul>');
    } ]);
    angular.module("templates/ya-treeview/treeview.tpl.html", []).run([ "$templateCache", function($templateCache) {
        $templateCache.put("templates/ya-treeview/treeview.tpl.html", "<div class=ya-treeview><div ya-node class=ya-node></div></div>");
    } ]);
})({}, function() {
    return this;
}());