xquery version "1.0";

let $word := request:get-parameter('word', '')
, $data-collection-url := replace(concat(substring-before(request:get-effective-uri(), 'search.xql'), 'data/'), "^/(exist/)?(rest/)?", "/")
, $wordnet-items := collection(concat($data-collection-url, 'items/'))//item
, $items := $wordnet-items[./words/word/lemma eq $word]
, $synsets := doc(concat($data-collection-url, 'synsets/noun.reduced.indented.xml'))//synset


return
	<items word="{$word}">
		{
		for $item in $items
		return
			<item>
				{
				(
				$item/* except $item/pointers,
				<hypernyms count="{count($item//hypernym)}">
					{
					for $hypernym in $item//hypernym
					return $synsets[@id = concat($hypernym/pos, $hypernym/synset_offset)]
					}
				</hypernyms>,
				<hyponyms count="{count($item//hyponym)}">
					{
					for $hyponym in $item//hyponym
					return $synsets[@id = concat($hyponym/pos, $hyponym/synset_offset)]
					}					
				</hyponyms>
				)
				}
			</item>
		}
	</items>