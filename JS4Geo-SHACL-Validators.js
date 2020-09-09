function coordMinOccur ($this, $coordMinSize) { // $coordMinSize deve ser o mesno nome da variável no ShapeFile
	// Defines an array for the return
	var results = [];
	// Defines the the IRI of the target node
	var coordPropertyName = TermFactory.namedNode("http://www.example.org#coordinates");  
	var rest = TermFactory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#rest");  
	var nil = TermFactory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#nil");   

    // Finds the object defined by the target node
	var propertyObject = $data.find($this, coordPropertyName, null) ;

	// Navigate the target node graph

    for (var t = propertyObject.next(); t; t = propertyObject.next()) {
		// Each instance is a Javascript object
		var node = t.object;
		var head = node;
		var length = 0;
		// This loop runs thorugh the list and 
		// counts how many elements are in the list.
		for ( ; node.value !== "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil"; ) {
            length++;
            var next = $data.find(node,rest,null).next();
            node = next ? next.object : nil; // Get object if triple
		}
		// If the list length < 2 ($coordMinSize), then it is an outlier.
		if (length < $coordMinSize.lex ) {
		 	results.push({
		 		value : head 
			});
		}
	}
	return results;
}

function bboxMinOccur ($this, $bboxMinSize) { // $bboxMinSize deve ser o mesno nome da variável no ShapeFile
	// Defines an array for the return
	var results = [];
	// Defines the the IRI of the target node
	var bboxPropertyName = TermFactory.namedNode("http://www.example.org#bbox");  
	var rest = TermFactory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#rest");  
	var nil = TermFactory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#nil");   

    // Finds the object defined by the target node
	var propertyObject = $data.find($this, bboxPropertyName, null) ;

	// Navigate the target node graph

    for (var t = propertyObject.next(); t; t = propertyObject.next()) {
		// Each instance is a Javascript object
		var node = t.object;
		var head = node;
		var length = 0;
		// This loop runs thorugh the list and 
		// counts how many elements are in the list.
		for ( ; node.value !== "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil"; ) {
            length++;
            var next = $data.find(node,rest,null).next();
            node = next ? next.object : nil; // Get object if triple
		}
		// If the list length < 2 ($bboxMinSize), then it is an outlier.
		if (length < $bboxMinSize.lex ) {
		 	results.push({
		 		value : head 
			});
		}
	}
	return results;
}