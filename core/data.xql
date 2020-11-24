xquery version "1.0";

let $resource-url := request:get-parameter('resource-url', '')
, $data-collection-url := replace(concat(substring-before(request:get-effective-uri(), 'core/data.xql'), 'data/'), "^/(exist/)?(rest/)?", "/")
, $structured-subjects := collection($data-collection-url)/*[@xml:base = $resource-url]


return
	<ssa:existing-structured-subjects xmlns:ssa="http://exist-db.org/ns/structured-subjects-editor/">
		{$structured-subjects}
	</ssa:existing-structured-subjects>