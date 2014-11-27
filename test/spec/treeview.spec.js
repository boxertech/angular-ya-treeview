'use strict';

describe('YaTreeview', function () {

    beforeEach(module('ya.treeview'));

    describe('service', function () {
        var httpBackend, service, vnode, options, q;

        beforeEach(inject(function ($httpBackend, YaTreeviewService, _$q_) {

            httpBackend = $httpBackend;
            service = YaTreeviewService;
            q = _$q_;

            vnode = {
                $model: {}
            };

            options = {
                childrenKey: 'children',
                expanded: true
            };
        }));

        afterEach(function () {
            httpBackend.verifyNoOutstandingExpectation();
            httpBackend.verifyNoOutstandingRequest();
        });

        it('should get children if children is an array', function () {
            var expected = ['test'];
            vnode.$model[options.childrenKey] = expected;

            q.when(service.children(vnode, options)).then(function(children){
                var actual = children;
                expect(actual).toBe(expected);
            });
        });

        it('should get children if children is a function', function () {
            var expected = ['test'];
            vnode.$model[options.childrenKey] = function () {
                return expected;
            };

            q.when(service.children(vnode, options)).then(function(children){
                var actual = children;
                expect(actual).toBe(expected);
            });
        });

        it('should return error if children is not an array nor a function', function () {
            vnode.$model[options.childrenKey] = 'test';

            q.when(service.children(vnode, options)).then(function(){
                throw new Error('children should return error when not array or function.');
            }, function(error){
                expect(error).toBeTruthy();
            });
        });

        it('should create a virtual node from a given node', function () {
            var parent = 'parent';
            var node = {};

            q.when(service.nodify(node, parent, options)).then(function(returnNode){
                var actual = returnNode;

                expect(actual.$parent).toBe(parent);
                expect(actual.$model).toBe(node);
                expect(actual.$hasChildren).toBeFalsy();
                expect(actual.collapsed).toBe(!options.expanded);
            });

        });

        it('should expand children', function () {
            var node = {node: 'node'};
            var child = {child: 'child'};
            node[options.childrenKey] = [child];

            q.when(service.nodify(node, null,options)).then(function(returnNode){
                var actual = returnNode;

                expect(actual.$model).toBe(node);
                expect(actual.$hasChildren).toBeTruthy();
                expect(actual.$children.length).toBe(1);
            });

        });

        it('should create children as virtual nodes', function () {
            var node = {node: 'node'};
            var child = {child: 'child'};
            node[options.childrenKey] = [child];

            q.when(service.nodify(node, null, options)).then(function(returnNode){
                var actual = returnNode;
                expect(actual.$children[0].$model).toBe(child);
                expect(actual.$children[0].$parent).toBe(actual);
                expect(actual.$children[0].$hasChildren).toBeFalsy();
                expect(actual.$children[0].collapsed).toBe(!options.expanded);
            });
        });

        it('should create an array of virtual nodes', function () {
            var node1 = {node1: 'node1'};
            var node2 = {node2: 'node2'};
            var nodes = [node1, node2];

            q.when(service.nodifyArray(nodes, null, options)).then(function(returnNodes){
                var actual = returnNodes;
                expect(actual.length).toBe(2);
                expect(actual[0].$model).toBe(node1);
                expect(actual[1].$model).toBe(node2);
            });

        });
    });

    describe('controller', function () {
        var scope, ctrl, timeout;

        beforeEach(inject(function ($controller, $rootScope, $timeout) {
            scope = $rootScope.$new();
            scope.model = [
                {
                    label: 'parent1',
                    children: [
                        {
                            label: 'child'
                        }
                    ]
                },
                {
                    label: 'parent2',
                    children: [
                        {
                            label: 'child',
                            children: [
                                {
                                    label: 'innerChild'
                                }
                            ]
                        }
                    ]
                },
                {
                    label: 'parent3'
                }
            ];
            scope.options = {
                onExpand: jasmine.createSpy(),
                onCollapse: jasmine.createSpy(),
                onSelect: jasmine.createSpy(),
                onDblClick: jasmine.createSpy()
            };
            timeout = $timeout;
            ctrl = $controller('YaTreeviewCtrl', {$scope: scope});
        }));

        it('should create a separate view', function () {
            scope.init().then(function(){
                console.log(scope.node);
                expect(scope.node).not.toBe(scope.model);
            });
        });

        it('should expand a node', function () {
            scope.init().then(function(){
                console.log(scope.node);
                var node = scope.node.$children[0];
                node.collapsed = true;
                scope.expand({}, node);
                timeout.flush();
                expect(node.collapsed).toBeFalsy();
                expect(node.$children.length).toBeGreaterThan(0);
                expect(scope.options.onExpand).toHaveBeenCalled();
            });
        });

        it('should collapse a node', function () {
            scope.init().then(function(){
                var node = scope.node.$children[0];
                node.collapsed = false;
                scope.collapse({}, node);
                timeout.flush();
                expect(node.collapsed).toBeTruthy();
                expect(scope.options.onCollapse).toHaveBeenCalled();
            });
        });

        it('should select a node', function () {
            scope.init().then(function(){
                var node = scope.node.$children[0];
                scope.selectNode({}, node);
                expect(scope.context.selectedNode).toBe(node);
                expect(scope.options.onSelect).toHaveBeenCalled();
            });
        });

        it('should dblClick a node', function () {
            scope.init().then(function(){
                var node = scope.node.$children[0];
                scope.dblClick({}, node);
                expect(scope.options.onDblClick).toHaveBeenCalled();
            });
        });
    });
});