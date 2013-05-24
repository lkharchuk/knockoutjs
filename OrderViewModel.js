var Booking = Booking || function() {}; // global Object container
/**
 * User: Larysa Kharchuk
 * Date: May 22, 2012
 * Time: 11:55:22 AM
 * To change this template use File | Settings | File Templates.
 */

Booking.Order = function (obj) {
    var self = this;
    self.id = ko.observable(obj.details.id);
    self.isPrioritize=ko.observable(obj.isPrioritize||false);
    self.enableSegments =ko.observable(obj.enableSegments||false);
    self.prioritizeType=ko.observable(obj.prioritizeType);

    self.groups = ko.observableArray(ko.utils.arrayMap(obj.groups || [], function(data) {
        return new Booking.Group(data,false);
    }));

    self.segments = ko.observableArray(ko.utils.arrayMap(obj.segments || [], function(data) {
        return new Booking.Segment(data,false);
    }));

    self.toggleClick=function(name){
      self[name](!self[name]()); 
    };

    //init general area
    Booking.getTargeting.call(self, obj.views,self.segments);

    //self.segments.subscribe(function(newValue) {
    //    console.log(newValue);
    //})

    //init Details Tab
    self.details = new Booking.Details(obj.details,self);

    //init track Changes
    self.trackDetailsChanges={};

    //track segments changes
    /*self.trackSegmentsChanges = ko.dependentObservable(function() {
        return ko.utils.arrayFilter(self.segments(), function(item) {
            return item.dirtyFlag.isDirty();
        });
    }, self);

    self.isDirty = ko.dependentObservable(function() {
        return this.trackSegmentsChanges().length > 0;
    }, self);*/

}

Booking.Details=function(obj,parent) {
    var self=this;

    for (var el in obj) {
        //if array
        if(typeof obj[el]=="object" && obj[el].length){
            if(el=="providers"){
                /*self[el] = ko.mapping.fromJS(obj[el]);*/
                self[el] = ko.observableArray();
                for (var i in obj[el]){
                    self[el].push(ko.observable( obj[el][i]));    
                }
            }
            else{
                self[el] = ko.observableArray(obj[el]);
            }
        }
        else{
            self[el] = ko.observable(obj[el]);
        }

        (function(el) {
            self[el].subscribe(function(newValue) {
                parent.trackDetailsChanges[el]=newValue;
            });
        }(el));
    }

    self.addNote=function(data,e){
        var newNote=e.target.value;
        if(e.which == 13 && newNote!=="") {
        	var currentTime = new Date(),
	        h = currentTime.getHours(),
	        m = currentTime.getMinutes(),
            s = currentTime.getSeconds(),
            suffix = " AM";

        	if (m < 10){
	            m = "0" + m;
            }
	        if (h >= 12) {
	            suffix = " PM";
	            h = h - 12;
	        }
	        if (h == 0) {
	            h = 12;
	        }
            self.notes.unshift({date:currentTime.toDateString()+" "+h+":"+m+":"+s+suffix,text:newNote});
            e.target.value="";
        }
        return true;
    };
}

Booking.getTargeting=function(obj,test) {
    this.targeting = ko.observableArray();

    this.isInArr = function(obj) {
        var equal = true;
        for (var i = 0,l = this.length; i < l; i++) {
            for (var el in this[i]) {
                if (obj[el] !== this[i][el]) {
                    equal = false;
                }
            }
            if (equal) {
                return true;
            }
            equal = true;
        }
        return false;
    };
    
    this.last = ko.computed({
        read: function() {
            return this.targeting().length > 0 ? this.targeting()[0] : "";
        },
        write: function(value) {
            var objName = value.view.id||value.view().id,
                curObj=this[objName],
                curIndex=null,
                tpmName="frequencyAdd_"+(this.segments?"general":"segments"),
                rtmpName="frequencyAdd_"+(this.segments?"segments":"general");
            //custom solution: drag only 1 element
            if(objName=="frequency" && (curObj && curObj().length>0  || (Booking[rtmpName]) )){

                return true;
            }

            if (curObj) {
                if(value.data && value.data.tree){
                    var rootObj=curObj()[0].dynatree;
                    jQuery.each(rootObj(),function(index,el){
                        if(value.data.key==el.key){
                            curIndex=index;
                            return true;
                        }
                    });
                    if(curIndex==null){
                        rootObj.unshift(value.data);
                    }
                    else{
                        var newObject=jQuery.extend({},rootObj()[curIndex]);
                        newObject=Booking.mergeDeepTreeNode(newObject,value.data);
                        rootObj.splice(curIndex,1,newObject);
                    }
                }
                else{
                    if(this.isInArr.call(ko.mapping.toJS(curObj()),value.data)==false){
                         if (value.view.edit){
                             value.data.edit=false;
                            curObj.unshift(ko.mapping.fromJS(value.data));
                         }
                         else{
                            curObj.unshift(value.data);
                         }
                    }
                }
            }
            else {
                //create dynamically new array
                this[objName] = ko.observableArray();
                curObj=this[objName];
                if(value.data && value.data.tree){
                    curObj.unshift(ko.mapping.fromJS({dynatree:[],tree:true,url:value.view.url||value.view().url}));
                    curObj()[0].dynatree.unshift(value.data);
                }
                else{
                    if (value.view.edit){
                        value.data.edit=false;
                        curObj.unshift(ko.mapping.fromJS(value.data));
                    }
                    else{
                        curObj.unshift(value.data);
                    }
                    if(objName=="frequency"){
                        Booking[tpmName]=(Booking[tpmName]?Booking[tpmName]:0)+1;
                    }
                }

                //add name of created view to top of targeting list
                this.targeting.unshift(objName);
            }
            if(value.data.id==null&&objName=='domains'){
                jQuery("#ActionBoardDialogTemplate").data("BookingObject",curObj).dialog("open");
            }
        },
        owner: this
    });

    this.deleteTarget = function(segment, viewName, el) {
        segment[viewName].remove(el);
        if(viewName=="frequency"){
            var tpmName="frequencyAdd_"+(segment.segments?"general":"segments");
            if(Booking[tpmName]==1){
                delete Booking[tpmName];
            }else{
                Booking[tpmName]-=1;
            }
        }
        if (segment[viewName]().length == 0) {
            delete segment[viewName];
            segment.targeting.remove(viewName);
        }
    };

    this.editElement=function(el,data){
        Booking.editElement=ko.mapping.toJS(el);
        el.edit(!el.edit());
    };

    this.restoreElement=function(el,data){
        for(var param in Booking.editElement){
            el[param](Booking.editElement[param]);
        }
    };

    this.showToggle=function(el,data){
        jQuery(data.currentTarget).next("div.hidden").toggle();
        return true;
    };

    //initialise
    for (var el in obj) {
        this.targeting.push(el);
        this[el] = ko.observableArray(ko.utils.arrayMap(obj[el], function(data) {
            return new Booking.TargetingData(data);
        }));
    }

    return this;
}

Booking.Segment=function(obj,isInitiallyDirty) {
    var self=this;
    //this.id = ko.observable(obj.id);
    this.name = ko.observable(obj.name);
    Booking.getTargeting.call(this, obj.views);
    this.dirtyFlag = new ko.dirtyFlag(this,isInitiallyDirty);
}

Booking.Group=function(obj) {
    var self=this;
    self.name = ko.observable(obj.name);
    if(typeof obj.segments=="function"){
        self.segments = obj.segments;
    }
    else{
        self.segments = ko.observableArray(ko.utils.arrayMap(obj.segments || [], function(data) {
            return new Booking.Segment(data,false);
        }));
    }
}

Booking.OrderViewModel=function (options) {
    var self = this;

    self.settings = {order:{
        details:{
                id :"",
                notes:[],
                startDate:"",
                endDate:"",
                client:"",
                advertiser:"",
                category:"",
                pricingType:"",
                pricingCurrency:"",
                pricingPrice:"",
                pricingCpm:"",
                pricingVolume:"",
                pricingClicks:"",
                providers:[],
                deliveryRTB:"",
                deliveryClasification:"",
                deliveryFold:"",
                deliveryPage:"",
                conversionTracking:"",
                trackingTag :""
            }
        },
        providers:[{id:'APN',title:'appnexus'},{id:'DCX',title:'DCX'},{id:'ID',title:'Improve digital'}],
        frequencyPeriod:["once","twise","etc"],
        frequencyCount:["6","10","11","12","13","14",""],
        frequencyTime:["minute","hour","day","week","two weeks","month"]
        };

    jQuery.extend(true,self.settings,options)

    self.order = ko.observable(new Booking.Order(self.settings.order));


    // Behaviours: order by group or segments - move objects between segments & group
    self.order().prioritizeType.subscribe(function(newValue) {
        if(newValue=="groups"){
            self.order().groups.push(new Booking.Group({name:"Group 1",segments:self.order().segments}));
            self.order().groups.push(new Booking.Group({name:"Group 2",segments:[]}));
        }
        else{
            var newArr=ko.observableArray();
            for(var i=0,len=self.order().groups().length;i<len;i++){
                if(self.order().groups()[i].segments().length>0){
                    newArr(newArr().concat(self.order().groups()[i].segments()));
                }
            }
            self.order().segments(newArr());
            self.order().groups([]);

        }
    });

    self.selectedTask= ko.observable();
    self.selectTask= function(task) {
        self.selectedTask(task);
    };

    self.addSegment = function(el) {
        //var getId=el.segments().length+1;
        //el.segments.push(new Booking.Segment({id:"segment_" + getId,name:"Segment " + getId},false));
        el.segments.push(new Booking.Segment({name:"New Segment"},false));
    };

    self.addGroup = function(el) {
        el.groups.push(new Booking.Group({name:"New Group", segments:[]}));
    };

    self.deleteGroup = function(parent, el) {
        parent.groups.remove(el);
    };

    self.deleteSegment = function(parent, el) {
        parent.segments.remove(el);
    };

    self.saveDraft=function(){
        var currentOrder=ko.mapping.toJS(self.order());
        jQuery.ajax({
            url: '/service/v1/command/settings.savedraft',
            data:{order:currentOrder},
            dataType:'json',
            type: "POST",
            success: function(result) {
                if (result.success) {
                }
                else {
                    //jQuery(that).find('.sub-container #' + name + id).removeClass('render').html('');
                    //jQuery(config.msgSelector).trigger("showMessage", ["Error","",result.error_message ? result.error_message : result]);
                }
            },
            error:function(result) {
                //jQuery(config.msgSelector).trigger("showMessage", ["Error","",result.responseText ? result.responseText : result]);
            }
        });
    };

}

ko.bindingHandlers.jqTabs = {
    init: function(element, valueAccessor) {
        var options = valueAccessor() || {};
        jQuery(element).tabs(options);
    }
};

ko.dirtyFlag = function(root, isInitiallyDirty) {
    var result = function() {}
    var _initialState = ko.observable(ko.toJSON(root));//ko.mapping.toJS
    var _isInitiallyDirty = ko.observable(isInitiallyDirty);

    result.isDirty = ko.dependentObservable(function() {
        return _isInitiallyDirty() || _initialState() !== ko.toJSON(root);
    });

    result.reset = function() {
        _initialState(ko.toJSON(root));
        _isInitiallyDirty(false);
    };

    return result;
};

//connect items with observableArrays
ko.bindingHandlers.sortableList = {
    init: function(element, valueAccessor, allBindingsAccessor, context) {
        jQuery(element).data("sortList", valueAccessor().data); //attach meta-data
        jQuery(element).sortable({
            update: function(event, ui) {
                var item = ui.item.data("sortItem");
                if (item) {
                    //identify parents
                    var originalParent = ui.item.data("parentList");
                    var newParent = ui.item.parent().data("sortList");
                    //figure out its new position
                    var position = ko.utils.arrayIndexOf(ui.item.parent().children(), ui.item[0]);
                    if (position >= 0) {
                        originalParent.remove(item);
                        newParent.splice(position, 0, item);
                    }

                    ui.item.remove();
                    jQuery('.ui-droppable.ui-state-default').removeClass('ui-state-default');
                }
            },
            connectWith:valueAccessor().connectWith,
            dropOnEmpty: true
        });
        jQuery(element).disableSelection();
    }
};

Booking.mergeDeepTreeNode=function (o1, o2) {
    var tempNewObj = o1,o1index=null;
    //if null
    if(o2==null){
        //tempNewObj = o2;
    }
    //if o1 is an object - {}
    else if (o1.length === undefined && typeof o1 !== "number" && typeof o1 !== "boolean") {
        jQuery.each(o2, function(i, value) {
            if (o1[i] === undefined || o1[i]==null) {
                tempNewObj[i] = value;
            } else {
                if (o1[i] !== o2[i]) {
                    tempNewObj[i] = Booking.mergeDeepTreeNode(o1[i], o2[i]);
                }
            }
        });
    }
    //else if o1 is an array - []
    else if (o1.length > 0 && typeof o1 !== "string") {
        jQuery.each(o2, function(o2index) {
            var str1=JSON.stringify(o1);
            if(str1.indexOf(o2[o2index].key)>=0){
            //find element in object1
                jQuery.each(o1, function(i,value) {
                    if(value.key==o2[o2index].key){
                        o1index=i;
                        return true;
                    }
                });
                tempNewObj[o1index].select=o2[o2index].select;
                if(o2[o2index].children!=null){

                    if(o1[o1index].children==null){
                        tempNewObj[o1index].children=o2[o2index].children;
                    }else{
                        tempNewObj[o1index].children=Booking.mergeDeepTreeNode(o1[o1index].children, o2[o2index].children);
                    }
                }
            }else{
                tempNewObj.push(o2[o2index]);
            }          
        });
    }

    //handling other types like string or number
    else {
        //taking value from the second object o2
        //could be modified to keep o1 value with tempNewObj = o1;
        tempNewObj = o2;
    }
    return tempNewObj;
};

//attach meta-data
ko.bindingHandlers.sortableItem = {
    init: function(element, valueAccessor) {
        var options = valueAccessor();
        jQuery(element).data("sortItem", options.item)
        jQuery(element).data("parentList", options.parentList);
    }
};

//control visibility, give element focus, and select the contents (in order)
ko.bindingHandlers.visibleAndSelect = {
    update: function(element, valueAccessor) {
        ko.bindingHandlers.visible.update(element, valueAccessor);
        if (valueAccessor()) {
            setTimeout(function() {
                jQuery(element).focus().select();
            }, 0); //new tasks are not in DOM yet
        }
    }
}
