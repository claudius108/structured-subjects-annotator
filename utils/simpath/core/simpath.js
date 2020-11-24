/*
 * Simpath - Simpathetic XPath processor
 * By Claudius Teodorescu
 * Licensed under LGPL.
 */

// alert( (new Date()).toISOString() );
window.$x = {
	"version" : "0.8",
	//array holding the data instances
	"_instances" : {},
	"sDefaultInstanceId" : "",
	"instance" : function(sInstanceId) {
		if (!sInstanceId) throw new Error($x._errors[3]); 
		if (!$x.sDefaultInstanceId) $x.sDefaultInstanceId = sInstanceId;
		return {
			"id" : sInstanceId
			, "root" : function() {return $x._instances[this.id].documentElement}
			, "snapshot" : function(sSnapshotId) {
				if (!sSnapshotId) throw new Error($x._errors[1]);
				$x._instances[this.id + "-" + sSnapshotId] = $x.parseFromString($x.serializeToString(this.root()));
			}
			, "reset" : function(sSnapshotId) {
				var sInstanceId = sSnapshotId ? this.id + "-" + sSnapshotId : this.id;
				$x._instances[sInstanceId] = $x.parseFromString($x.serializeToString($x._instances[sInstanceId]));
			}
			, "source" : function(sSnapshotId) {
				var sInstanceId = sSnapshotId ? this.id + "-" + sSnapshotId : this.id;
				return $x.serializeToString($x._instances[sInstanceId]);
			}
			, "load" : function(oXMLDoc) {
				$x._instances[this.id] = oXMLDoc;
			}
		}
	},
	"xpath" : function(sRefXPathExpr, oXPathContext){
		return $x.compile(sRefXPathExpr, oXPathContext, 0)[1];
	},
	"evaluate" : function(nXPathExprId, oXPathContext) {
		return (new Function("oXPathContext", $x.xe[nXPathExprId].fXPathResultHandler )(oXPathContext ? $x._fDocFromNode(oXPathContext) : null));
	},
	//object holding the compiled XPath expressions
	"xe" : {},
	"parseFromString" : function(sXMLstring) {
		var oDOMParser = new DOMParser();
		return oDOMParser.parseFromString(sXMLstring, "text/xml");
	},
	"serializeToString" : function(oXMLDoc) {
		var oXMLSerializer = new XMLSerializer();
		return oXMLSerializer.serializeToString(oXMLDoc);
	},
	"setvalue" : function(sRefXPathExpr, sValueXPathExpr, oXPathContext) {
		$x.compile(sRefXPathExpr, oXPathContext, 2, sValueXPathExpr);
	},
	"insert" : function() {},
	"delete" : function() {},
	"replace" : function() {},
	"reset" : function() {
		$x._instances = {};
		$x.xe = {};
	},
	"submission" : function(oSubmissionOptions) {
		if (!oSubmissionOptions) throw new Error($x._errors[0]);
		this.methods = {
			"_options" : {
				"asynchronous" : true,
				"synchronous" : false
			},
			"_ajax" : function(oAjaxOptions) {
				if (oAjaxOptions.mode in this._options) {
					oAjaxOptions.mode = this._options[oAjaxOptions.mode];
				} else {
					throw new Error($x._errors[2])
				}
				var xhReq = new XMLHttpRequest();
				xhReq.open(oAjaxOptions.method, oAjaxOptions.resource, oAjaxOptions.mode);
				switch(oAjaxOptions.method) {
					case 'get':
						xhReq.send(null);
						var oXMLDoc = xhReq.responseXML
						, ref = oAjaxOptions.ref
						;
						$x._instances[ref.substring(ref.indexOf("'") + 1, ref.lastIndexOf("'"))] = $x.utils.fCollectNSs(oXMLDoc);
					break;
					case 'post':
						xhReq.setRequestHeader("Content-Type", "text/xml");
						xhReq.send($x.serializeToString($x.xpath(oSubmissionOptions.ref)[0]));
						if(xhReq.readyState != 4 || xhReq.status != 200) {
							oSubmissionOptions['simpath-submit-error']();
						} else {
							oSubmissionOptions['simpath-submit-done']();
						}
					break;
				}
			},
			"get" : function(oSubmissionOptions) {
				return this._ajax(oSubmissionOptions);
			},
			"post" : function(oSubmissionOptions) {
				return this._ajax(oSubmissionOptions);
			}
		};
		return (this.methods[oSubmissionOptions.method])(oSubmissionOptions);
	},
	"utils" : {
		"isIE" : /*@cc_on!@*/0,
		//string containing namespaces
		"sNSs" : "xmlns:xsl=\"http://www.w3.org/1999/XSL/Transform\" ",
		"fCollectNSs" : function(oXMLDoc) {
			if ($x.utils.isIE) {
				var oSpaceAttr = oXMLDoc.createNode(2, "xml:space", "http://www.w3.org/XML/1998/namespace");
				oSpaceAttr.value = "preserve";
				oXMLDoc.documentElement.attributes.setNamedItem(oSpaceAttr);
			}
			var sXMLDoc = $x.serializeToString(oXMLDoc.documentElement)
			, utils = $x.utils
			, sNSs = utils.sNSs
			, sXMLDoc = sXMLDoc.substring(sXMLDoc.indexOf(" "), sXMLDoc.indexOf(">"))
			, sXMLDoc = sXMLDoc.substring(0,(sXMLDoc.lastIndexOf('/') == sXMLDoc.length - 1) ? sXMLDoc.lastIndexOf('/') : sXMLDoc.length).split(" ")
			;
			for ( var i = 1, il = sXMLDoc.length; i < il; i++ ) {
				var oNamespace = sXMLDoc[i];
				if (!(oNamespace.substring(0, 6) === "xmlns:")) {continue;}
				if (sNSs.search(oNamespace) == -1) {sNSs += oNamespace.replace(/\"/g, '\"') + " ";};
			}
			utils.sNSs = sNSs;
			var _XSLTtemplates = []
			, _sXSLTStartTag = utils._sXSLTStartTag.replace(/\$sNSs>/, sNSs + ">")
			, _sXSLTidentityTemplate = "<xsl:template match=\"node()|@*\"><xsl:copy><xsl:apply-templates select=\"node()|@*\"/></xsl:copy></xsl:template>"
			//XSLT template for all XPath expressions but attributes sequence
			, _sXSLTAllTemplate =
				_sXSLTStartTag +
				"<xsl:template match=\"/\"><simpath:xpath-result><xsl:copy-of select=\"\"/></simpath:xpath-result></xsl:template>" + "<xsl:template match=\"text()\"/>" +
				"</xsl:stylesheet>"
			//XSLT template for attributes sequence
			, _sXSLTAttrSeqTemplate =
				_sXSLTStartTag +
					"<xsl:template match=\"\">" +
						"<xsl:for-each select=\"\">" +
							"<xsl:element name=\"simpath:item\">" +
								"<xsl:copy-of select=\".\"/>" +
							"</xsl:element>" +
						"</xsl:for-each>" +
					"</xsl:template>" +
					"<xsl:template match=\"/\">" +
						"<simpath:xpath-result>" +
							"<xsl:apply-templates/>" +
						"</simpath:xpath-result>" +
					"</xsl:template>" +
					"<xsl:template match=\"text()\"/>" +
				"</xsl:stylesheet>"
			//XSLT template for setvalue() function
			, _sXSLTsetElementValueTemplate =
				_sXSLTStartTag + "<xsl:template match=\"\"><xsl:choose><xsl:when test=\"*\"><simpath:error type=\"simpath-binding-exception\"/></xsl:when><xsl:otherwise><xsl:copy><xsl:copy-of select=\"@*\"/><xsl:value-of select=\"\"/></xsl:copy></xsl:otherwise></xsl:choose></xsl:template>"  + _sXSLTidentityTemplate + "</xsl:stylesheet>"
			, _sXSLTsetAttributeValueTemplate =
				_sXSLTStartTag + "<xsl:template match=\"\"><xsl:attribute name=\"{name(.)}\"><xsl:value-of select=\"\"/></xsl:attribute></xsl:template>" + _sXSLTidentityTemplate + "</xsl:stylesheet>"
			;
			_XSLTtemplates.push($x.parseFromString(_sXSLTAllTemplate));
			_XSLTtemplates.push($x.parseFromString(_sXSLTAttrSeqTemplate));
			_XSLTtemplates.push($x.parseFromString(_sXSLTsetElementValueTemplate));
			_XSLTtemplates.push($x.parseFromString(_sXSLTsetAttributeValueTemplate));
			_XSLTtemplates.push($x.parseFromString(_sXSLTStartTag + _sXSLTidentityTemplate + "</xsl:stylesheet>"));
			_XSLTtemplates.push($x.parseFromString("<xsl:variable xmlns:xsl=\"http://www.w3.org/1999/XSL/Transform\" name=\"\"/>"));
			$x._XSLTtemplates = _XSLTtemplates;
			return oXMLDoc;
		}
	},
	"_fXPathExprProcessor" : function(sRefXPathExpr, oXPathContext, nCallingFunctionIndex, sValueXPathExpr) {
		var nXPathExprId = (new Date).getTime()
		, fn = $x.fn
		, xe = $x.xe
		, sInstanceId
		, oXSLTVariables = {}
		, aXPathExprFuncs = {}//TODO: this is specific for simpath:instance()
		, _instances = $x._instances
		, fXPathResultHandler
		;
		//register the object containing the compiled XPath expression e. a.
		xe[nXPathExprId] = {
			"sRefXPathExpr" : sRefXPathExpr
			, "fXPathResultHandler" : ""
			, "oXSLTDoc" : ""
		};
		//check if the XPath expression is a 'string'
		if (sRefXPathExpr.indexOf("'") == 0) {
			$x.xe[nXPathExprId].fXPathResultHandler = "return " + sRefXPathExpr;
			return [nXPathExprId, sRefXPathExpr];
		}
		//check for XPath extension function simpath:instance() of Simpath
		//at beginning of XPath expression, which gives the in-scope evaluation context
		if (sRefXPathExpr.substring(0, 17) === "simpath:instance(") {
			sInstanceId = sRefXPathExpr.substring(18, sRefXPathExpr.indexOf(")") - 1);
			sRefXPathExpr = sRefXPathExpr.substring(sRefXPathExpr.indexOf(")") + 1);
		} else {
			sInstanceId = $x.sDefaultInstanceId;
		}
		var sXMLDoc = oXPathContext ? "oXPathContext" : "$x._instances['" + sInstanceId + "']"
		, nLastStepIndex = sRefXPathExpr.search($x._oRegExprs[0])
		, nXPathResultHandlerIndex = ((nLastStepIndex != -1) ? 1 : 0) + nCallingFunctionIndex
		, oXSLTDoc = $x._fDocFromNode($x._XSLTtemplates[nXPathResultHandlerIndex].childNodes[0])
		, oXSLTDocLastTemplate = oXSLTDoc.selectSingleNode("/xsl:stylesheet/xsl:output").nextSibling//oXSLTDoc.childNodes[0].lastChild
		//check for XPath extension function simpath:instance() of Simpath
		//within the XPath expression
		, aFuncMatches = sRefXPathExpr.match(/simpath:instance\('[a-zA-Z0-9-]+'\)/g)
		;
		for (var i = 0, il = (aFuncMatches != null) ? aFuncMatches.length : 0; i < il; i++) {
			var start = new Date().getTime();
			var sFuncMatch = aFuncMatches[i];
			if (sFuncMatch in aXPathExprFuncs) continue;
			var nVariableHash = (new Date).getTime() + i;
			//appending to oXSLTDoc the XSLT variable model and setting it
			var oVariableModel = $x._XSLTtemplates[5].documentElement.cloneNode(true);
			oVariableModel.setAttribute("name", "var" + nVariableHash);
			oXSLTDoc.childNodes[0].insertBefore(oVariableModel, oXSLTDocLastTemplate);
			//setting the handler for this XSLT variable
			var fXPathFuncHandler = fn.simpath.instance(oXSLTVariables, nVariableHash, sFuncMatch, sRefXPathExpr);
			//$("<tr/>", {"html" : "<td>Average time for 1 run for '_fXPathExprProcessor' (ms): " + ( ( new Date()).getTime() -start ) + "</td>"}).appendTo("#results-3 table");
			oXSLTVariables = fXPathFuncHandler[0];
			sRefXPathExpr = fXPathFuncHandler[1];
			//TODO: this is specific to simpath: instance() - have to generalized
			aXPathExprFuncs[sFuncMatch] = (new Date).getTime();
		}
		//calculate XSLT variables and append them to oXSLTDoc
		for (nVariableHash in oXSLTVariables) {
			oXSLTDoc.selectSingleNode("//xsl:variable[@name = 'var" + nVariableHash + "']").appendChild(oXSLTVariables[nVariableHash].getXSLTVariable());
		}
	
		//append processed XPath expression et. al. to oXSLTDoc
		switch(nXPathResultHandlerIndex) {
			//xpath function for element(s)
			case 0:
				oXSLTDoc.selectSingleNode("/xsl:stylesheet/xsl:template//xsl:copy-of/@select").value = sRefXPathExpr;
				fXPathResultHandler =
					"var oXSLTDoc = $x.xe[" + nXPathExprId + "].oXSLTDoc;" +
					"return $x._XPathResultFunctions[0]($x.transform(" + sXMLDoc + ", oXSLTDoc), '" + nXPathExprId + "');";
			break;
			//xpath function for attribute(s)
			case 1:
				var sLastStep = sRefXPathExpr.substring(nLastStepIndex)
				, sAttrName = sLastStep.substring(sLastStep.indexOf("@") + 1);
				sRefXPathExpr = sRefXPathExpr.substring(0, nLastStepIndex);
				oXSLTDoc.selectSingleNode("/xsl:stylesheet/xsl:template/@match").value = (sRefXPathExpr ? sRefXPathExpr : "*");
				oXSLTDoc.selectSingleNode("/xsl:stylesheet/xsl:template/xsl:for-each/@select").value = "." + sLastStep;
				fXPathResultHandler =
					"var oXSLTDoc = $x.xe[" + nXPathExprId + "].oXSLTDoc;" +
					"return $x._XPathResultFunctions[1]($x.transform(" + sXMLDoc + ", oXSLTDoc), '" + sAttrName + "');";
			break;
			//setvalue function for element and attribute, respectively
			case 2: case 3:
				oXSLTDoc.selectSingleNode("/xsl:stylesheet/xsl:template/@match").value = sRefXPathExpr;
				oXSLTDoc.selectSingleNode("/xsl:stylesheet/xsl:template//xsl:value-of/@select").value = sValueXPathExpr;
				fXPathResultHandler =
					"var oXSLTDoc = $x.xe[" + nXPathExprId + "].oXSLTDoc;" +
					"$x._instances['" + sInstanceId + "'] = $x._fDocFromNode($x.transform(" + sXMLDoc + ", oXSLTDoc).documentElement.cloneNode(true));";
			break;
		}
		xe[nXPathExprId]['oXSLTDoc'] = oXSLTDoc;
		xe[nXPathExprId]['oXSLTVariables'] = oXSLTVariables;
		return [nXPathExprId, sRefXPathExpr, sXMLDoc, sInstanceId, nXPathResultHandlerIndex, sAttrName, fXPathResultHandler];
	},
	"_fDocFromNode" : function(oNode) {
		var oNodeDoc = document.implementation.createDocument("", "", null);
		var oClonedNode = oNodeDoc.importNode(oNode, true);
		oNodeDoc.appendChild(oClonedNode);
		return oNodeDoc;
	},
	"transform" : function(oXMLDoc, oXSLTDoc) {
		var oXSLTProcessor = new XSLTProcessor();
		oXSLTProcessor.importStylesheet(oXSLTDoc);
		return oXSLTProcessor.transformToDocument(oXMLDoc);
	},
	"fn" : {
		"simpath" : {
			"instance" : function(oXSLTVariables, nVariableHash, sFuncMatch, sRefXPathExpr) {
				var start = new Date().getTime();
				oXSLTVariables[nVariableHash] = {
					sInstanceId : sFuncMatch.substring(0, sFuncMatch.indexOf(")") - 1).substring(18),
					getXSLTVariable : function() {
						return $x._instances[sFuncMatch.substring(0, sFuncMatch.indexOf(")") - 1).substring(18)].childNodes[0].cloneNode(true);
					}
				}
				//process the XPath expression
				sRefXPathExpr = sRefXPathExpr.replace(sFuncMatch, "exslt:node-set($var" + nVariableHash + ")");
				//$("<tr/>", {"html" : "<td>Average time for 1 run for 'fn.simpath.instance' (ms): " + ( ( new Date()).getTime() -start ) + "</td>"}).appendTo("#results-4 table");
				return [oXSLTVariables, sRefXPathExpr];			
			}
		}
	},
	"_XSLTtemplates" : [],
	"_XPathResultFunctions" : [],
	"_oRegExprs" : [
		/(\/|\/\/)@[a-zA-Z0-9_-]+[:]?[a-zA-Z0-9_-]*[^)|\]]$/
		, /method=\"xml\"/
		, /_XPathResultFunctions\[0\]/
	],
	"_errors" : [
		"err:Simpath001: Function submission() is missing argument 'oSubmissionOptions'.",
		"err:Simpath002: Function snapshot() is missing argument 'sSnapshotId'.",
		"err:Simpath003: Unknown mode option for submission() method.",
		"err:Simpath004: Function instance() is missing argument 'sInstanceId'.",
		function(sErrorDescription, sRefXPathExpr) { return "err:Simpath005 (compile error): " + sErrorDescription + ",\nfor the following XPath expression: \"" + sRefXPathExpr + "\"";}
	]
};
$x.compile = function(sRefXPathExpr, oXPathContext, nCallingFunctionIndex, sValueXPathExpr) {
	var start = new Date().getTime();
	var oXPathResult
	, oProcessedXPathExpr = $x._fXPathExprProcessor(sRefXPathExpr, oXPathContext, nCallingFunctionIndex, sValueXPathExpr)
	, nXPathExprId = oProcessedXPathExpr[0]
	, sProcessedXPathExpr = oProcessedXPathExpr[1]
	, sXMLDoc = oProcessedXPathExpr[2]
	;
	if (sRefXPathExpr.indexOf("'") == 0) {
		return [nXPathExprId, sProcessedXPathExpr];
	}
	var fXPathResultHandler = $x.xe[nXPathExprId].fXPathResultHandler = oProcessedXPathExpr[6];
	//$("<tr/>", {"html" : "<td>Average time for 1 run for 'xpath.compile' (ms): " + ( ( new Date()).getTime() -start ) + "</td>"}).appendTo("#results-2 table");	
	try {
		oXPathResult = (new Function("oXPathContext", fXPathResultHandler )(oXPathContext ? $x._fDocFromNode(oXPathContext) : null));
	}
	catch(error) {
		throw new Error($x._errors[4](error.description, sRefXPathExpr))
		//alert("simpath compile error: " + error.description + ",\nfor the following XPath expression: \"" + sRefXPathExpr + "\"");
	}
	
	return [nXPathExprId, oXPathResult];
};
//set some global strings
$x.utils._sXSLTStartTag = "<xsl:stylesheet version=\"1.0\" xmlns:simpath=\"http://kuberam.ro/ns/simpath\" xmlns:msxsl=\"urn:schemas-microsoft-com:xslt\" xmlns:exslt=\"http://exslt.org/common\" $sNSs><xsl:output method=\"xml\"/><msxsl:script language=\"JScript\" implements-prefix=\"exslt\">this['node-set'] = function(x) {return x;}</msxsl:script>";
//initializing the engine utilities based upon the user agent
if (typeof(DOMParser) == 'undefined') {
	$x._fSetDOMParser = function() {
		var _XMLDocumentImpl = new ActiveXObject("MSXML2.DOMDocument.3.0");
		_XMLDocumentImpl.async = false;
		$x._XMLDocumentImpl = _XMLDocumentImpl;
	}
	//set the IE DOM Parser (with ActiveX)
	$x._fSetDOMParser();
	$x.parseFromString = function(sXMLstring) {
		var _XMLDocumentImpl = $x._XMLDocumentImpl;
		_XMLDocumentImpl.loadXML(sXMLstring);
		return _XMLDocumentImpl.cloneNode(true);
	};
	$x.serializeToString = function(oXMLDoc) {return oXMLDoc.xml;};
}
if (typeof(XSLTProcessor) == 'undefined') {
	$x.transform = function(oXMLDoc, oXSLTDoc) {
		var oResult = $x._XMLDocumentImpl;
		oXMLDoc.transformNodeToObject(oXSLTDoc, oResult);
		return oResult;
	};
	$x._fDocFromNode = function(oNode) {
		return $x.parseFromString($x.serializeToString(oNode));
	}
	//modify the XSLT output method
	$x.utils._sXSLTStartTag = $x.utils._sXSLTStartTag.replace($x._oRegExprs[1], "method=\"html\"");
}
//collection of namespaces for base document
if ($x.utils.isIE) {//document.namespaces
// 	$x.utils.isIE = true;
	var sXMLDoc = document.documentElement.outerHTML;
	sXMLDoc = "<html" + sXMLDoc.substring(sXMLDoc.indexOf("<HTML") + 5, sXMLDoc.indexOf("<HEAD"))+ "</html>";
	var oXMLDoc = $x.parseFromString(sXMLDoc);
	$x.utils.fCollectNSs(oXMLDoc);
} else {
	$x.utils.fCollectNSs(document);
	XMLDocument.prototype.selectSingleNode = function(sXPathExpr) {
		this.nsResolver = function( prefix ) { return "http://www.w3.org/1999/XSL/Transform"; };
		return this.evaluate(sXPathExpr, this.documentElement, this.nsResolver, 9, null).singleNodeValue;
	}
}

(function() {
	//function for compiling XPath result consisting of any item but attribute(s) sequence
	$x._XPathResultFunctions[0] = function(oXPathResult, nXPathExprId) {
		var fXPathResultHandler = $x.xe[nXPathExprId].fXPathResultHandler;
		//case when the result is empty, string, boolean, or number
		if (!oXPathResult.childNodes[0].childNodes[0] || oXPathResult.childNodes[0].childNodes[0].nodeType == 3) {
			$x.xe[nXPathExprId].fXPathResultHandler = fXPathResultHandler.substring(0, fXPathResultHandler.indexOf('return')) + "return " + fXPathResultHandler.substring(fXPathResultHandler.indexOf('$x.transform('), fXPathResultHandler.indexOf('oXSLTDoc)')) + "oXSLTDoc).childNodes[0].text;";
			return oXPathResult.childNodes[0].text;
		} else {//case when the result is a sequence of nodes
			$x.xe[nXPathExprId].fXPathResultHandler = fXPathResultHandler.substring(0, fXPathResultHandler.indexOf('return')) + "return " + fXPathResultHandler.substring(fXPathResultHandler.indexOf('$x.transform('), fXPathResultHandler.indexOf('oXSLTDoc)')) + "oXSLTDoc).childNodes[0].childNodes;";
			return oXPathResult.childNodes[0].childNodes;
		}
	};
	//function for outputting XPath result consisting of attribute(s) sequence
	$x._XPathResultFunctions[1] = function(oXPathResult, sAttrName) {
		var items = oXPathResult.childNodes[0].childNodes;
		var aItems = new Array();
		for ( var i = 0, il = items.length; i < il; i++ ) {
			var attribute = document.createAttribute(sAttrName);
			attribute.nodeValue = items[i].getAttribute(sAttrName);
			aItems.push(attribute);
		}
		return aItems;
	};

})();
//implement text() to standard browsers, in order to be 
//aligned with IE 8, which has no textContent method
if (typeof(document.documentElement.textContent) != 'undefined') {
	Element.prototype.__defineGetter__("text", function() {
		return this.textContent;
	});
}
//set the module's base URL
(function(sModuleName, sModuleNS) {
	window[sModuleNS ? sModuleNS : sModuleName].utils.baseURI = document.querySelector("script[src*='" + sModuleName + "']").src.match(new RegExp("^(.)*(/)?" + sModuleName + "/"))[0];
})('simpath', '$x');