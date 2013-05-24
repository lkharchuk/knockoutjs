/**
 * User: Larysa Kharchuk
 * Date: May 22, 2012
 * Time: 11:55:22 AM
 * To change this template use File | Settings | File Templates.
 */
var Booking = Booking || function() {}; // global Object container

//objects constructors
Booking.draggedTargeting = {};//don't delete;
Booking.multyTargeting=[];
Booking.multyTargetingAction = function(el, data) {
    if (el.toggleClass('grouped-drag').is('.grouped-drag')) {
        Booking.multyTargeting.unshift(data);
    }
    else {
        Booking.multyTargeting.splice(Booking.multyTargeting.indexOf(data), 1);
    }
};
Booking.multyTargetingClear=function(){
    Booking.multyTargeting=[];
    Booking.draggedTargeting={};
    jQuery(".grouped-drag").removeClass('grouped-drag');
};
Booking.getParentNodeData=function(node){
    var selectNode=function(node, flag){
        if(node.data){
            node.data.select=flag;
            //select all child too
            for (var ch in node.data.children){
                selectNode(node.data.children[ch], flag);
            }
        }
        else{
            node.select=flag;
            //select all child too
            for (var ch in node.children){
                selectNode(node.children[ch], flag);
            }
        }

    }
    node.select(true);
    selectNode(node,true);
    var nodeParent=jQuery.extend(true,{},node);
    node.select(false);
    selectNode(node,false);

    var nodePrevData=jQuery.extend(true,{}, nodeParent.data),
        nodeLevel=nodeParent.getLevel(),
        getParentNode=function(l){
            if(l>1){
                nodeParent=jQuery.extend(true,{},nodeParent.parent);
                nodeParent.data.expand=true;
                nodeParent.data.children=[nodePrevData];
                nodePrevData=jQuery.extend(true,{}, nodeParent.data);
                getParentNode(l-1);
            }
        };

    if(nodeLevel>1){
        getParentNode(nodeLevel);
    }
    nodeParent.data.tree=true;
    return nodeParent.data;
};
Booking.bindTreeDrag = function(selector, treeData, view, allBindingsAccessor, isInit) {
    selector.find("li").each(function(index, el) {
        if((isInit==true & index>0)||isInit==false){
            var newValueAccessor = function () {
                return {'value':treeData[index].data ||treeData[index],view:view()};
            };
            ko.bindingHandlers['drag']['init'].call(this, el, newValueAccessor, allBindingsAccessor);
        }
    });
};
Booking.toArray = function(obj) {
    var arr = new Array();
    for (var name in obj) {
        if (obj[name].text != "") {
            arr.push(obj[name]);
        }
    }
    return arr;
};

Booking.ActionBoardViewModel = function(options) {
    var self = this;
    self.settings = {
        content:[
            {"Assets":[{id:"creatives",label:"Creatives",url:"/service/v1/command/creative.getsessioncreative",edit:true}]},
            {"Targeting":[
                {id:"domains",label:"Domain/URL",url:'/service/v1/command/settings.gettemplatesforclient',filter:true},
                {id:"countryAndRegions",label:"Country & Regions",url:'/service/v1/command/geo.mutual',tree:true,filter:true},
                {id:"semantics",label:"Semantics",url:'/service/v1/command/semantics.isense',tree:true, filter:true},
                {id:"brands",label:"Brand protection",url:'/service/v1/command/semantics.sitescreen'},
                {id:"frequency",label:"Frequency",edit:true},
                {id:"retargeting",label:"Retargeting",filter:true,edit:true}
            ]},
            {"Optimization": [{id:"optimization",label:"General optimization"}]}
        ]
    };

    if (typeof options == 'object') {
        self.settings = jQuery.extend(self.settings, options);
    }

    //Action Board components
    self.content = ko.observableArray();
    self.showContent = ko.observable(true);
    self.currentContent = ko.observable();

    self.currentContent.subscribe(function(newValue) {
        //init one time data
        Booking.multyTargetingClear();

        //TAGs tab
        if(newValue && newValue.id){
            jQuery('#TabsContainer').tabs(newValue.id=='retargeting' ?'enable'  : 'disable', 2);
        }

        if (!newValue || self[newValue.id]().length != 0 || newValue.tree){
            return true;
        }
         //init one time data
        if (newValue.url) {
            self.initAjaxContentData(newValue.id,newValue.url);
        }else{
            self.initContentData(newValue.id);
        }

    });

    self.getContentId = ko.computed(function() {
        if (self.currentContent()) {
            return self.currentContent().id || null;
        }
        return null;
    });

    self.setContent = function(el) {//
        self.currentContent(el);
    };


    self.ctrlClick=function(data, event){
        if (event.ctrlKey) {
            Booking.multyTargetingAction(jQuery(event.currentTarget),data);
        }
    };

    self.key_press_counter = 0;
    self.filter=function(data,e,n){
        // Do something
        if(n == self.key_press_counter)
        {
            jQuery(this).blur();
            var container=jQuery("#"+data.id);
            var count = container.find(".item")
                    .filter(".item:not(:visible)").show().end()
                    .filter(".item:not(:containsNC('" + e.target.value + "'))").hide()
                    .end().filter(':visible').length;
            var _empty = container.find(".empty");
            if (count == 0) {
                if (_empty.length == 0)
                    container.append("<div class='empty'>no match</div>");
                else
                    _empty.show();
            }
            else {
                _empty.remove();
            }
            if (e.target.value === "") {
                _empty.remove();
                e.target.value="Filter";
            }
        }
    };

    self.filterTree = function(data,e,n) {
        if (n == self.key_press_counter) {
                self[data.id]([]);
             if (e.target.value === "") {
                e.target.value="Filter";
            }
        }
    };

    self.initFilter = function(data,e) {
            if(data.tree){
                setTimeout(self.filterTree, 600,data,e, ++self.key_press_counter);
            }
            else{
                setTimeout(self.filter, 600,data,e, ++self.key_press_counter);
            }
        return true;
    };

    self.clearValue=function(data,e) {
                if(e.target.value=="Filter"){
                    e.target.value="";
                }
    };

    self.tagUpload=function(data,e){
        var data=jQuery(e.currentTarget).siblings("textarea").val();
        jQuery.ajax({
            url: '/service/v1/command/creative.tagupload',
            data:data,
            type: "POST",
            dataType: 'json',
            success: function (result) {
                if(result.sucsess=="true"){
                    self.initAjaxContentData('creatives',self.currentContent().url);
                }
            }
        });

    };

    self.ajaxFileUpload=function(){
        jQuery.ajaxFileUpload({
            url:'/service/v1/command/creative.upload?format=xml',
            secureuri:false,
            fileElementId:'Filedata',//fileToUpload',
            dataType: 'xml',//'json',
            beforeSend:function() {
                jQuery("#loading").show();
            },
            complete:function() {
                jQuery("#loading").hide();
            },
            success: function (data, status) {
                if (typeof(data.error) != 'undefined') {
                    if (data.error != '') {
                        alert(data.error);
                    } else {
                        alert(data.msg);
                    }
                }
                else{
                    var newfileName=data.getElementsByTagName("answer")[0].getElementsByTagName("filename")[0].firstChild.data;
                    self.initAjaxContentData('creatives',self.currentContent().url);

                }
            },
            error: function (data, status, e) {
                alert(e);
            }
        });
        return false;
    };

    self.initContentData = function(id) {
        jsonArr =[
            {id:1,text:"test " + id + " 1"},
            {id:2,text:"test " + id + " 2"},
            {id:3,text:"test " + id + " 3"}
        ];

        if (id=='frequency'){
            jsonArr =[
                {id:1,period:"once",count:"11",time:"hour"},
                {id:2,period:"forth",count:"12",time:"hour"},
                {id:3,period:"once",count:"13",time:"hour"},
                {id:4,period:"once",count:"14",time:"day"}
            ];
        }

        if (id=='retargeting'){
            jsonArr =[
                {id:1,text:"Retargeting 1, Advertiser",count:11,include:"false"},
                {id:2,text:"Retargeting 2, Advertiser",count:12,include:"false"},
                {id:3,text:"Retargeting 3, Advertiser",count:13,include:"false"},
                {id:4,text:"Retargeting 4, Advertiser",count:14,include:"false"},
                {id:5,text:"Retargeting 5, Advertiser",count:15,include:"false"}
            ];
        }
        //self[id].unshift(ko.mapping.fromJS(jsonArr));
        self[id](jsonArr);
    };

    self.initAjaxContentData = function(id,url) {
        jQuery.ajax({
            url: url,
            type: "POST",
            /*contentType: "application/json; charset=utf-8",*/
            dataType: 'json',
            success: function (data) {
                if(id=="domains"){
                    self[id](Booking.toArray(data.templates));//as object- we need array
                    App.BasketTMP.data = data.templates == null ? {} : data.templates;
                }else{
                    self[id](data);
                }
            }
        });
    };

    self.initialize = function(groups) {
        var obj,childArr,groupName;
        for (var group in groups) {
            groupName=Object.keys(groups[group])[0];
            obj = groups[group][groupName];
            childArr=[];
            for (var el in obj) {//search in Arr of objects                
                //childArr.push(new Booking.Targeting(obj[el]));
                childArr.push(obj[el]);
                self[obj[el].id] = ko.observableArray();//init empty oject                
            }
            self.content.push({label:groupName,targeting: childArr});
        }
    }(self.settings.content);

    if (location.pathname.toLowerCase().indexOf("/booking/order") < 0) {
        self.showContent(false);
    }
}

ko.bindingHandlers.jqButton = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
        if (viewModel.type === undefined || viewModel.type !== "header") {
            jQuery(element).button();
        }
    },
    update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
        var value = ko.utils.unwrapObservable(valueAccessor()),
                disabled = ko.utils.unwrapObservable(value.disabled);
        jQuery(element).button("option", "disabled", disabled);

        //init toggle button style
        if (allBindingsAccessor().checked && allBindingsAccessor().checked() == true) {
            jQuery("label[for=" + element.id + "]").toggleClass("ui-state-active");
        }
    }
};

ko.bindingHandlers.jqFileUpload = {
    init: function(element, valueAccessor, allBindingsAccessor) {
        var uploader = new qq.FileUploader({
            // pass the dom node (ex. $(selector)[0] for jQuery users)
            element: element,
            inputName: 'Filedata',
            // path to server-side upload script
            action: '/service/v1/command/creative.upload',//?format=xml'
            // validation
            // ex. ['jpg', 'jpeg', 'png', 'gif'] or []
            allowedExtensions: [],
            // each file size limit in bytes - this option isn't supported in all browsers
            //sizeLimit: 0, // max size
            //minSizeLimit: 0, // min size
            // set to true to output server response to console
            debug: false,

            // events
            // you can return false to abort submit
            onSubmit: function(id, fileName){},
            onProgress: function(id, fileName, loaded, total){},
            onComplete: function(id, fileName, responseJSON){
                 //self.initAjaxContentData('creatives',self.currentContent().url);
            },
            onCancel: function(id, fileName){},
            onError: function(id, fileName, xhr){}
        });
    }
};

ko.bindingHandlers.drag = {
    init: function(element, valueAccessor, allBindingsAccessor) {
        var getValue=valueAccessor();
        var dragOptions = {
            //helper: 'clone',
            revert: true,
            revertDuration: 0,
            helper: function() {
                    var container = jQuery('<div/>').attr('id', 'helperDraggingContainer');
                    if(jQuery(this).is('.grouped-drag')){
                        var cur_clone=jQuery(this).siblings('.grouped-drag').andSelf().clone();
                        cur_clone.css("width",this.clientWidth+"px").find("ul").remove();
                    }else{
                       Booking.multyTargetingClear();
                       var cur_clone=jQuery(this).clone();
                       cur_clone.css("width",this.clientWidth+"px").find("ul").remove();
                    }
                    container.append(cur_clone);
                    if(this.dtnode){
                        container[0].dtnode=this.dtnode;
                    }
                    return container[0];
	        },
            start: function(event, ui) {
                Booking.draggedTargeting.view=getValue.view;
                if(!ui.helper.context.dtnode){
                    Booking.draggedTargeting.data= getValue.value;
                }
                else{
                    Booking.draggedTargeting.data=Booking.getParentNodeData(ui.helper.context.dtnode);
                }
                jQuery(this).parents(".content:first").css("overflow","visible");
            },
            stop: function(event, ui) {
                Booking.multyTargetingClear();
                jQuery(this).parents(".content:first").css("overflow","auto");
            },
            cursor: 'default'
        };
         jQuery(element).draggable(dragOptions).disableSelection();
    }   
};

ko.bindingHandlers.drop = {
    init: function(element, valueAccessor, allBindingsAccessor) {
        var dropOptions = {
            activeClass: "ui-state-default",
            hoverClass: "ui-state-hover",
            accept: ":not(.ui-sortable-helper)",
            drop: function(event, ui) {
                if(Booking.multyTargeting.length>0){
                    for(var el in Booking.multyTargeting){
                        Booking.draggedTargeting.data=Booking.multyTargeting[el];
                        //Booking.draggedTargeting.object=
                        valueAccessor().value(Booking.draggedTargeting);
                    }
                }
                else{
                    valueAccessor().value(Booking.draggedTargeting);
                }
            }
        };
        jQuery(element).droppable(dropOptions);
    }
};

ko.bindingHandlers.jqDynatree = {
    update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
        if(!valueAccessor().enable){
            return true;
        }
        var curView=viewModel.currentContent;
        var url=curView ?   curView().url : valueAccessor().obj.url();
        var initSettings = {
            classNames: {
                active:'',
                focused:''
            },
            onPostInit: function(isReloading, isError, data) {
                 if(typeof valueAccessor().data=="function"){
                    var treeData=this.tnRoot.childList;
                    Booking.bindTreeDrag(this.$tree, treeData,  curView,allBindingsAccessor, true);//datavalueAccessor().data,
                    valueAccessor().data(treeData); 
                 }
            },
            onLazyRead: function(node) {
                jQuery.ajax({
                            url: url,
                            data: {country: node.data.country ||node.data.key  , region:node.data.region,id:node.data.key},
                            success: function(data, textStatus){
                                // In this sample we assume that the server returns JSON like
                                // { "status": "...", "result": [ {...}, {...}, ...]}
                                if((data && data.status && data.status.result=='failure') ||textStatus !== "success"){
                                    // Server returned an error condition: set node status accordingly
                                    node.setLazyNodeStatus(DTNodeStatus_Error, {
                                        tooltip: data.faultDetails,
                                        info: data.faultString
                                    });
                                }
                                else{
                                    // Convert the response to a native Dynatree JavaScipt object.
                                    if(typeof valueAccessor().data=="function"){//if lazy read in actionBoard
                                        var len = data.length;
                                        for (var i=0; i<len; ++i) {
                                             data[i].isLazy=data[i].isLazy=="true"?true:false;//make boolean
                                        }
                                        node.data.children=data;
                                        //update parent element with child data-to avoid double ajax at order area
                                        var self=this;
                                        var childIndex=jQuery(node.li).index();

                                        node.setLazyNodeStatus(DTNodeStatus_Ok);
                                        node.addChild(data);

                                        jQuery(node.ul).parents("li").each(function(index, el) {
                                            if(index>0){
                                                el.dtnode.data.children[childIndex].children=data;
                                                childIndex=jQuery(el).index();
                                            }
                                        });

                                        //made new child dragable
                                        Booking.bindTreeDrag(jQuery(node.ul), data, curView, allBindingsAccessor, false);//drag child separate
                                    }
                                    else{
                                        // PWS status OK
                                        var len = data.length;
                                        var activeStatus=node.isSelected();
                                        for (var i=0; i<len; ++i) {
                                             data[i].isLazy=data[i].isLazy=="true"?true:false;//make boolean
                                             if(activeStatus){
                                                 data[i].select=true;
                                             }
                                        }
                                        node.setLazyNodeStatus(DTNodeStatus_Ok);
                                        node.addChild(data);
                                        //apply changes to object
                                        valueAccessor().obj.dynatree(node.tree.toDict().children);
                                    }
                                }
                            }
                        });

            }
        };

        if (typeof valueAccessor().data == "object") {
            initSettings.activateParent=valueAccessor().view=="semantics"?false:true;
            initSettings.children = valueAccessor().data;
            initSettings.onExpand= function(node, event) {valueAccessor().obj.dynatree(this.toDict().children);return true;};
            initSettings.onClick = function(node, event) {
                if(node.getEventTargetType(event) == "title"){
                    var selectNode = function(curNode, flag,type) {
                        curNode.select(flag);
                        if(!type||type=="childList"){
                            for (var el in curNode["childList"]) {
                                selectNode(curNode["childList"][el], flag,"childList");
                            }
                        }
                        if(flag==false && (type=="parent" ||!type)){
                            if(curNode.tree.options.activateParent && curNode["parent"]){
                                selectNode(curNode["parent"], flag,"parent");
                            }
                        }
                    };

                    selectNode(node, !node.data.select);

                    //apply changes to object
                    valueAccessor().obj.dynatree(this.toDict().children);

                    // Prevent default processing
                    return false;
                }
                return true;
            };
        }
        else {
            initSettings.onClick = function(node, event) {
                var nodeParent;
                if(node.getEventTargetType(event) == "title" && event.ctrlKey){//apply multiply dragging elements
                    Booking.multyTargetingAction(jQuery(node.li),Booking.getParentNodeData(node));
                    // Prevent default processing
                    return false;
                }
                return true;
            };
            var filterKey=jQuery(element).siblings(".search:visible").find("input").val();
            if(filterKey!=='' && filterKey!=='Filter'){
                url=url.substring(0,url.indexOf("."))+".search?q="+filterKey;
            }
            initSettings.initAjax = {url: url};
        }

        jQuery(element).dynatree("destroy");
        jQuery(element).empty();
        jQuery(element).dynatree(initSettings);
    }
};


jQuery.extend(jQuery.expr[":"], {
    "containsNC": function(elem, i, match, array) {
        return (elem.textContent || elem.innerText || "").toLowerCase().indexOf((match[3] || "").toLowerCase()) >= 0;
    }
});