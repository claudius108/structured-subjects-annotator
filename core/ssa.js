window.ssa = {
	"version" : "0.2",
	"utils" : {},
	"fAddSubject" : function() {
		var $selector = ssa.$selector;
		ssa.$addSubjectDialog.dialog('open');
		//initialize the UI
		$("input[type = 'text']").val("");
		$("input[name = 'structured_subject_type'][value = 'basic']").attr('checked', true);
		$("input[name = 'topical_component_form'][value = 'concept']").attr('checked', true);
		$("input[name = 'temporal_component_form'][value = 'time-point']").attr('checked', true);

		//initialize the structured subject model
		$x.setvalue("simpath:instance('ssa-model')//dc:date", "'" + $.now() + "'");
		$x.setvalue("simpath:instance('ssa-model')/rdf:RDF/@xml:id", "'ssa" + $.now() + "'");
		$x.setvalue("simpath:instance('ssa-model')/rdf:RDF/rdf:Description/@rdf:about", "'" + $selector.val() + "'");
		$selector.val("");
		return false;
	},
	"fShowExistingSubjects" : function() {
		ssa.$existingStructuredSubjectsContainer.dialog('open');
	},
	"fShowNewSubjects" : function() {
		$("<div/>", {
				"id" : "new-structured-subjects-master-container",
				"title" : "New structured subjects",
				"html" : $x.serializeToString($x.transform($x._instances['new-structured-subjects'], $x._instances['view-structured-subjects']).documentElement)
			}).appendTo("body").dialog({
					"autoOpen" : false,
					"width" : 700,
					"height" : 300,
					"modal" : true,
					open: function(){
						$("#new-structured-subjects-container").accordion({
							active: false
						});
					},
					close: function(ev, ui) {
						$(this).dialog('destroy');
						$("#new-structured-subjects-master-container").remove();
					},
					buttons: {
						"Close": function() {
							$( this ).dialog( "close" );
						}
			}
			}).dialog('open');
	},
	"fSaveNewSubjects" : function() {
		$x.submission({
			"ref" : "simpath:instance('new-structured-subjects')/*"
			, "resource" : "store.xql"
			, "mode" : "synchronous"
			, "method" : "post"
			, "simpath-submit-done" : function() {
				$.noticeAdd({
					text: 'Structured subjects were saved!',
					stay: false,
					type: 'notice-success'
				});
			}
			, "simpath-submit-error" : function() {
				$.noticeAdd({
					text: 'Structured subjects were not saved!',
					stay: true,
					type: 'notice-error'
				});
			}
		});
	},
	_fEditStructuredSubject : function(oStructuredSubject) {
		//initialize the UI
		$("#topical-component").val($x.xpath("//ssa:topical-component/text()", oStructuredSubject));
		$("#geographical-component").val($x.xpath("//ssa:geographical-component/text()", oStructuredSubject));
		$("#temporal-component").val($x.xpath("//ssa:temporal-component/text()", oStructuredSubject));

		$("input[name = 'structured_subject_type'][value = '" + $x.xpath("//ssa:subject-type/text()", oStructuredSubject) + "']").attr('checked', true);
		$("input[name = 'topical_component_form'][value = '" + $x.xpath("//ssa:topical-component/@ssa:form", oStructuredSubject)[0].nodeValue + "']").attr('checked', true);
		$("input[name = 'temporal_component_form'][value = '" + $x.xpath("//ssa:temporal-component/@ssa:form", oStructuredSubject)[0].nodeValue + "']").attr('checked', true);

		//initialize the structured subject model
		$x.setvalue("simpath:instance('ssa-model')//dc:date", "'" + $.now() + "'");
		$x.setvalue("simpath:instance('ssa-model')/rdf:RDF/@xml:id", "'ssa" + $.now() + "'");
		$x.setvalue("simpath:instance('ssa-model')/rdf:RDF/rdf:Description/@rdf:about", "'" + $x.xpath("/rdf:RDF/rdf:Description/@rdf:about", oStructuredSubject)[0].nodeValue + "'");
	},
	_fWordNetLookup : function(sWord) {
		//load the ontology items
		$("#topical-component").val(sWord);
		$x.submission({
			"ref" : "simpath:instance('ontology-lookup')",
			"resource" : ssa.utils.baseURI + "/services/search2.xql?word=" + sWord,
			"mode" : "synchronous",
			"method" : "get"
		});
		$("#synsets-hierarchy-container").html($x.transform($x._instances['ontology-lookup'], $x._instances['synsets-hierarchy']).documentElement.textContent);
	}
};

$(document).ready(function() {
	//get the tei-ann module's base uri
	var sDocumentURL = document.URL;
	ssa.utils.baseURI = sDocumentURL.substring(0, sDocumentURL.indexOf("core/ssa.html"));
	//define data instance for annotator's toolbar
	$x.instance('annotator-toolbar').load($x.parseFromString("<kyer:menu xmlns:kyer=\"http://kuberam.ro/ns/kyer\"/>"));
	//load annotator's toolbar
	$x.submission({
		"ref" : "simpath:instance('annotator-toolbar')",
		"resource" : "ssa-toolbar.xml",
		"mode" : "synchronous",
		"method" : "get"
	});
	$($x.serializeToString(kyer.construct.menu($x._instances['annotator-toolbar']))).prependTo("body");

/*
*	Structured Subject Annotator
*/
	//define data instance for existing structured subjects
	$x.instance('existing-structured-subjects').load($x.parseFromString("<ssa:existing-structured-subjects xmlns:ssa=\"http://exist-db.org/ns/structured-subjects-editor/\"/>"));
	//load structured subjects related to the current page
	$x.submission({
		"ref" : "simpath:instance('existing-structured-subjects')",
		"resource" : "data.xql?resource-url=" + sDocumentURL,
		"mode" : "synchronous",
		"method" : "get"
	});
	//define data instance for new structured subjects
	$x.instance('new-structured-subjects').load($x.parseFromString("<ssa:new-structured-subjects xmlns:ssa=\"http://exist-db.org/ns/structured-subjects-editor/\"/>"));
	//define data instance for structured subject model
	$x.instance('ssa-model').load($x.parseFromString("<rdf:RDF xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\"/>"));
	//load the structured subject model
	$x.submission({
		"ref" : "simpath:instance('ssa-model')",
		"resource" : "ssa-model.xml",
		"mode" : "synchronous",
		"method" : "get"
	});
	$x.setvalue("simpath:instance('ssa-model')//dc:creator", "'anonymous'");
	$x.setvalue("simpath:instance('ssa-model')/rdf:RDF/@xml:base", "'" + sDocumentURL + "'");
	$x.instance('ssa-model').snapshot('initial');

	//define data instance for UI
	$x.instance('ssa-ui').load($x.parseFromString("<div xmlns=\"http://www.w3.org/1999/xhtml\"/>"));
	//load the UI	
	$x.submission({
		"ref" : "simpath:instance('ssa-ui')",
		"resource" : "ssa-ui.xml",
		"mode" : "synchronous",
		"method" : "get"
	});
	$("body").append($x.instance('ssa-ui').source());
	//initialize the add subject dialog
	ssa.$addSubjectDialog = $("#add-subject-dialog")
		.dialog({
			autoOpen: false,
			width : 1000,
			height : 500,
			buttons: {
				"Save": function() {
					$x.setvalue("simpath:instance('ssa-model')//ssa:topical-component", "'" + $("#topical-component").val() + "'");
					$x.setvalue("simpath:instance('ssa-model')//ssa:geographical-component", "'" + $("#geographical-component").val() + "'");
					$x.setvalue("simpath:instance('ssa-model')//ssa:temporal-component", "'" + $("#temporal-component").val() + "'");
					$x.setvalue("simpath:instance('ssa-model')//ssa:subject-type", "'" + $("input[name = 'structured_subject_type']:checked").val() + "'");
					$x.setvalue("simpath:instance('ssa-model')//ssa:topical-component/@ssa:form", "'" + $("input[name = 'topical_component_form']:checked").val() + "'");
					$x.setvalue("simpath:instance('ssa-model')//ssa:temporal-component/@ssa:form", "'" + $("input[name = 'temporal_component_form']:checked").val() + "'");
					$($x._instances['new-structured-subjects'].childNodes[0]).append($x._instances['ssa-model'].childNodes[0].cloneNode(true));
					$x.instance('ssa-model').reset('initial');
					$( this ).dialog( "close" );
				},
				Cancel: function() {
					$x.instance('ssa-model').reset('initial');
					$( this ).dialog( "close" );
				}
			}
	});

	//code for text selection
	ssa.$selector = $($("<div/>", {"id" : "ssa-selector", "style" : "display: none;"}).appendTo("body"));
	$("body").selection({
		idOnly: true,
		ignore: ".ref,.annotation",
		onSelect: function(pageX, pageY) {
			var selection = this.getSelectedText();
			if (selection) {
				ssa.$selector.val(selection.selector);
			}
		}
	});

	//define data instance for new structured subjects
	$x.instance('existing-structured-subjects-model').load($x.parseFromString("<xsl:stylesheet xmlns:xsl=\"http://www.w3.org/1999/XSL/Transform\"/>"));
	//load the structured subject model
	$x.submission({
		"ref" : "simpath:instance('view-structured-subjects')",
		"resource" : "view-structured-subjects.xml",
		"mode" : "synchronous",
		"method" : "get"
	});

	//generate container for existing structured subjects
	ssa.$existingStructuredSubjectsContainer = $("<div/>", {
		"id" : "existing-structured-subjects-master-container",
		 "title" : "Existing structured subjects",
		"html" : $x.serializeToString($x.transform($x._instances['existing-structured-subjects'], $x._instances['view-structured-subjects']).documentElement)
	}).appendTo("body").dialog({
			"autoOpen" : false,
			"width" : 700,
			"height" : 300,
			"modal" : true,
			open: function(){
        			$("#existing-structured-subjects-container").accordion({
					active: false
				});
      			},
			buttons: {
				"Close": function() {
					$( this ).dialog( "close" );
				}
			}
	});
	//define data instance for autocomplete sources
	$x.instance('autocomplete-sources').load($x.parseFromString("<script type=\"text/javascript\" charset=\"utf-8\" xmlns=\"http://www.w3.org/1999/xhtml\"/>"));
	//load the structured subject model
	$x.submission({
		"ref" : "simpath:instance('autocomplete-sources')",
		"resource" : "autocomplete-sources.xml",
		"mode" : "synchronous",
		"method" : "get"
	});
	//generate sources for autocomplete inputs
	$($x.serializeToString($x.transform($x._instances['existing-structured-subjects'], $x._instances['autocomplete-sources']).documentElement)).appendTo("body");
	$("input#topical-component").autocomplete({
    		source: ssa._oAutocompleteSourceTopical,
		change: function(event, ui) {ssa._fEditStructuredSubject($x.xpath("simpath:instance('existing-structured-subjects')//rdf:RDF[@xml:id = '" + ui.item.id + "']")[0]);}
	});
	$("input#geographical-component").autocomplete({
    		source: ssa._oAutocompleteSourceGeographical,
		change: function(event, ui) {ssa._fEditStructuredSubject($x.xpath("simpath:instance('existing-structured-subjects')//rdf:RDF[@xml:id = '" + ui.item.id + "']")[0]);}
	});
	$("input#temporal-component").autocomplete({
    		source: ssa._oAutocompleteSourceTemporal,
		change: function(event, ui) {ssa._fEditStructuredSubject($x.xpath("simpath:instance('existing-structured-subjects')//rdf:RDF[@xml:id = '" + ui.item.id + "']")[0]);}
	});
	//define data instance for ontologies lookups
	$x.instance('ontology-lookup').load($x.parseFromString("<items/>"));
	//define data instance for synsets hierarchy's model
	$x.instance('synsets-hierarchy').load($x.parseFromString("<xsl:stylesheet xmlns:xsl=\"http://www.w3.org/1999/XSL/Transform\"/>"));
	//load the synsets hierarchy's model
	$x.submission({
		"ref" : "simpath:instance('synsets-hierarchy')",
		"resource" : "synsets-hierarchy.xml",
		"mode" : "synchronous",
		"method" : "get"
	});
	//generate events for synsets hierarchy
});
//TODO:
/*
NOTES:
/rdf:RDF represents one structured subject

/rdf:RDF/@xml:base contains the annotated page

/rdf:RDF/rdf:Description/@rdf:about contains the selector for the annotated fragment (
in case when the whole page is annotated, this is empty?)

Version 0.3
- edit/delete a new structured subject
- structured subject model and structured subject UI will have an extensible format, XForms like
(you will not depend on me for modifying them);
-for saving, a subjects' modified status should exist; in case they are modified, save warning should appear
on leaving page
- dc:date should be xsd:dateTime

*/



