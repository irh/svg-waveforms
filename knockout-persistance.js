// adapted from http://keestalkstech.com/2014/02/automatic-knockout-model-persistence-offline-with-amplify/

ko.trackChange = function (observable, key) {
  //initialize from stored value, or if no value is stored yet,
  //use the current value
  var value = localStorage.getItem(key) || observable();

  //track the changes
  observable.subscribe(function (newValue) {
    localStorage.setItem(key, newValue);

    if (ko.toJSON(observable()) != ko.toJSON(newValue)) {
      observable(newValue);
    }
  });

  observable(value); //restore current value
};

ko.persistChanges = function (vm, prefix) {
  if (prefix === undefined) {
    prefix = '';
  }

  for (var n in vm) {
    var observable = vm[n];
    var key = prefix + n;

    if (ko.isObservable(observable) && !ko.isComputed(observable)) {
      //track change of observable
      ko.trackChange(observable, key);

      //force load
      observable();
    }
  }
};

ko.isComputed = function (instance) {
  if ((instance === null) || (instance === undefined) || (instance.__ko_proto__ === undefined)) {
    return false;
  }

  if (instance.__ko_proto__ === ko.dependentObservable) {
    return true;
  }

  return ko.isComputed(instance.__ko_proto__); // Walk the prototype chain
};

ko.getComputedProperties = function(model) {
  var result = [];
  for (property in model) {
    var observable = model[property];
    if (model.hasOwnProperty(property)
        && ko.isObservable(observable)
        && ko.isComputed(observable)) {
      result.push(property);
    }
  }
  return result;
}

ko.cleanJSON = function(model) {
  return ko.mapping.toJSON(model, { "ignore": ko.getComputedProperties(model) });
}

ko.reset = function (targetModel, sourceModel) {
  for (var property in targetModel) {
    var observable = targetModel[property];
    if (targetModel.hasOwnProperty(property)
        && sourceModel.hasOwnProperty(property)
        && ko.isObservable(observable)
        && !ko.isComputed(observable)) {
      var sourceObservable = sourceModel[property];
      if (sourceObservable) {
        observable(sourceObservable());
      }
    }
  }
};

