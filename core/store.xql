xquery version "1.0";

let $data := request:get-data()
, $data-collection-url := replace(concat(substring-before(request:get-effective-uri(), 'core/store.xql'), 'data/'), "^/(exist/)?(rest/)?", "/")
, $login := xmldb:login('/db', 'admin', 'iubitamea108')


return
	<ssa:stored-structured-subjects xmlns:ssa="http://exist-db.org/ns/structured-subjects-editor/">
		{
			for $resource in $data/*
				return
					<ssa:stored-structured-subject>
						{xmldb:store($data-collection-url, concat($resource/@xml:id, '.xml'), $resource)}
					</ssa:stored-structured-subject>
		}
	</ssa:stored-structured-subjects>