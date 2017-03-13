const PREC = {
  union: 2,
  intersection: 2,
  declaration: 1
};

module.exports = grammar(require('tree-sitter-javascript/grammar'), {
  name: 'typescript',

  conflicts: ($, previous) => previous.concat([

    // TODO - Figure out why these are needed.
    [$.required_parameter, $.assignment],
    [$.required_parameter, $._expression],
    [$.required_parameter, $._primary_type],

    [$.identifier, $.predefined_type],

    // ( foo ? )
    //       ^ expression or optional parameter?
    [$._expression, $.optional_parameter],

    // foo: "string"
    //      ^ expression or literal type?
    [$._expression, $.literal_type],

    [$.method_signature, $.method_definition, $._expression],

    [$._expression, $._type_member, $.method_signature],

    // parenthesized_type starting with object type or function type starting with a destructuring pattern?
    [$._expression, $._primary_type],

    [$._expression, $.required_parameter, $._primary_type],

    [$._expression, $.property_signature],

    [$._expression, $.property_signature, $.method_signature],

    [$._expression, $.property_signature, $._property_definition_list],

    [$.property_signature, $._property_definition_list],

    // < Type >
    //       ^ jsx_opening_element or type_parameter?
    [$.jsx_opening_element, $.type_parameter],

    [$.this_type, $.this_expression],

    [$.required_parameter, $.type_reference],
    [$._expression, $.required_parameter, $.type_reference],
    [$._expression, $.type_reference],

    [$.ambient_binding, $.variable_declarator],

    [$._expression, $.type_query],

    // let x: (string)
    //               ^ parenthesized_type or function_type
    [$.parameter_identifier, $.predefined_type]
  ]),
  rules: {

    // Overrides
    pair: ($, previous) => seq(
      seq(
        choice($.identifier, $.reserved_identifier, $.string, $.number, $.accessibility_modifier)),
      ':',
      $._expression
    ),

    // Override import and export to support Flow 'import type' statements
    import_statement: ($, previous) => seq(
      'import',
      optional(choice('type', 'typeof')),
      choice(
        seq($.import_clause, $._from_clause),
        $.string
      ),
      terminator()
    ),

    export_statement: ($, previous) => choice(
      seq('export', '*', $._from_clause, terminator()),
      seq('export', $.export_clause, $._from_clause, terminator()),
      seq('export', $.export_clause, terminator()),
      seq('export', $._declaration),
      seq('export', 'default', $.anonymous_class),
      seq('export', optional('default'), $.ambient_function),
      seq('export', 'default', $._expression, terminator()),
      seq('export', '=', $.identifier, terminator())
    ),

    variable_declarator: ($, previous) => choice(
      seq($.identifier, optional($.type_annotation), optional($._initializer)),
      seq($.destructuring_pattern, optional($.type_annotation), $._initializer)
    ),


    ambient_method_declaration: $ => seq(
      propertyName($),
      $.call_signature,
      terminator()
    ),

    _paren_expression: ($, previous) => seq(
      '(', choice(seq($._expression, optional($.type_annotation)), $.comma_op), ')'
    ),

    formal_parameters: ($, previous) => seq(
      '(',
      commaSep($._parameter),
      ')'
    ),

    function: ($, previous) => seq(
      optional('async'),
      'function',
      optional($.identifier),
      $.call_signature,
      $.statement_block
    ),

    class_body: ($, previous) => seq(
      '{',
      repeat(
        choice(
          seq($.method_definition, optional(';')),
          $.ambient_method_declaration,
          seq($.public_field_definition, terminator()),
          seq($.index_signature, terminator())
        )
      ),
      '}'
    ),

    public_field_definition: $ => seq(
      optional($.accessibility_modifier),
      optional('static'),
      optional($.readonly),
      $.variable_declarator
    ),

    method_definition: $ => seq(
      optional($.accessibility_modifier),
      optional('static'),
      optional($.readonly),
      optional('async'),
      optional(choice('get', 'set', '*')),
      choice($.identifier, $.reserved_identifier),
      $.call_signature,
      $.statement_block
    ),

    // A function, generator, class, or variable declaration
    _declaration: ($, previous) => prec(PREC.declaration, choice(
      $.function,
      $.generator_function,
      $.class,
      $.module,
      $.variable_declaration,
      $.lexical_declaration,
      $.type_alias_declaration,
      $.enum_declaration,
      $.interface_declaration,
      $.ambient_declaration
    )),

    class_heritage: ($, previous) => choice(
      $.extends_clause,
      $.implements_clause
    ),

    // Additions

    implements_clause: $ => seq(
      'implements',
      commaSep1($.type_reference)
    ),

    ambient_declaration: $ => seq(
      'declare',
      choice(
        $.ambient_variable,
        $.ambient_function,
        $.class,
        $._ambient_enum,
        $.ambient_namespace,
        $.module,
        $.type_alias_declaration
      )
    ),

    ambient_variable: $ => seq(
      variableType(),
      commaSep1($.ambient_binding),
      terminator()
    ),

    ambient_function: $ => seq(
      'function',
      $.identifier,
      $.call_signature,
      terminator()
    ),

    class: ($, previous) => seq(
      'class',
      $.identifier,
      optional($.type_parameters),
      optional($.class_heritage),
      $.class_body
    ),

    _ambient_enum: $ => $.enum_declaration,

    ambient_namespace: $ => seq(
      'namespace', sepBy1('.', $.identifier), '{', optional($.ambient_namespace_body), '}'
    ),

    module: $ => seq(
      'module',
      choice($.string, $.identifier),
      '{',
        repeat(seq(
          choice(
            $.import_statement,
            $.export_statement,
            $.ambient_function,
            $._declaration),
          optional(terminator()))),
      '}'
    ),

    ambient_namespace_body: $ => repeat1($.ambient_namespace_element),

    ambient_namespace_element: $ => seq(
      optional('export'),
      choice(
        $.ambient_variable,
        $.lexical_declaration,
        $.ambient_function,
        $.class,
        $.interface_declaration,
        $._ambient_enum,
        $.ambient_namespace,
        $.import_alias
      )
    ),

    import_alias: $ => seq(
      'import',
      $.identifier,
      '=',
      $.entity_name,
      terminator()
    ),

    entity_name: $ => sepBy1('.', $.identifier),

    ambient_binding: $ => seq(
      $.identifier,
      optional($.type_annotation)
    ),

    interface_declaration: $ => seq(
      'interface',
      $.identifier,
      optional($.type_parameters),
      optional($.extends_clause),
      $.object_type
    ),

    extends_clause: $ => seq(
      'extends',
      sepBy1(',', $.type_reference)
    ),

    enum_declaration: $ => seq(
      optional('const'),
      'enum',
      $.identifier,
      '{',
      optional($._enum_body),
      '}'
    ),

    _enum_body: $ => seq(
      seq(sepBy1(',', $._enum_member), optional(','))
    ),

    _enum_member: $ => choice(
      // TODO this should be a PropertyName
      $.identifier,
      $.enum_assignment
    ),

    enum_assignment: $ => seq(
      $.identifier,
      $._initializer
    ),

    type_alias_declaration: $ => seq(
      'type',
      $.identifier,
      optional($.type_parameters),
      '=',
      $._type,
      terminator()
    ),

    accessibility_modifier: $ => choice(
      'public',
      'private',
      'protected'
    ),

    readonly: $ => 'readonly',

    _parameter: $ => choice(
      $.required_parameter,
      $.rest_parameter,
      $.optional_parameter
    ),

    parameter_identifier: $ => choice(
      'any',
      'number',
      'boolean',
      'string',
      'symbol',
      'void'
      ),

    required_parameter: $ => choice(
      seq(
        optional($.accessibility_modifier),
        choice(pattern($), $.parameter_identifier),
        optional($.type_annotation),
        optional($._initializer))
    ),

    optional_parameter: $ => choice(
      seq(
        optional($.accessibility_modifier),
        pattern($),
        '?',
        optional($.type_annotation)),
      seq(
        optional($.accessibility_modifier),
        pattern($),
        '?',
        optional($.type_annotation),
        $._initializer)
    ),

    rest_parameter: $ => seq(
      '...',
      $.identifier,
      optional($.type_annotation)
    ),

    type_annotation: $ => seq(
      ':', $._type
    ),

    _type: $ => choice(
      $._primary_type,
      $.union_type,
      $.intersection_type,
      $.function_type,
      $.constructor_type
    ),

    constructor_type: $ => seq(
      'new',
      optional($.type_parameters),
      $.formal_parameters,
      '=>',
      $._type
    ),

    _primary_type: $ => choice(
      $.parenthesized_type,
      $.predefined_type,
      $.type_reference,
      $.object_type,
      $.array_type,
      $.tuple_type,
      $.flow_maybe_type,
      $.type_query,
      $.this_type,
      $.existential_type,
      $.literal_type
    ),

    type_query: $ => seq(
      'typeof',
      sepBy1('.', $.identifier)
    ),

    literal_type: $ => choice($.number, $.string, $.true, $.false),

    existential_type: $ => '*',

    this_type: $ => 'this',

    flow_maybe_type: $ => prec.right(seq( '?', $._primary_type )),

    parenthesized_type: $ => seq(
      '(', $._type, ')'
    ),

    predefined_type: $ => choice(
      'any',
      'number',
      'boolean',
      'string',
      'symbol',
      'void'
    ),

    type_arguments: $ => seq(
      '<', commaSep1($._type), '>'
    ),

    type_reference: $ => seq(
      sepBy1('.', $.identifier),
      optional($.type_arguments)
    ),

    object_type: $ => seq(
      choice('{', '{|'), optional($._type_body), choice('}','|}')
    ),

    _type_body: $ => choice(
      $._type_member,
      seq(sepBy1(choice(',',';', $._line_break), $._type_member), optional(choice(',',';')))
    ),

    _type_member: $ => prec.right(choice(
      $.property_signature,
      $.call_signature,
      $.construct_signature,
      $.index_signature,
      $.method_signature
    )),

    property_signature: $ => seq(propertyName($), optional('?'), optional($.type_annotation)),

    call_signature: $ => seq(
      optional($.type_parameters),
      $.formal_parameters,
      optional($.type_annotation)
    ),

    type_parameters: $ => seq(
      '<', commaSep1($.type_parameter), '>'
    ),

    type_parameter: $ => seq(
      $.identifier,
      optional($.constraint)
    ),

    constraint: $ => seq(
      choice('extends', ':'),
      $._type
    ),

    construct_signature: $ => seq(
      'new',
      optional($.type_parameters),
      $.formal_parameters,
      optional($.type_annotation)
    ),

    index_signature: $ => choice(
      seq('[', $.identifier, ':', 'string', ']', $.type_annotation),
      seq('[', $.identifier, ':', 'number', ']', $.type_annotation)
    ),

    method_signature: $ => seq(propertyName($), optional('?'), $.call_signature),

    array_type: $ => seq(
      $._primary_type, '[', ']'
    ),

    tuple_type: $ => seq(
      '[', commaSep1($._type), ']'
    ),

    union_type: $ => prec.left(PREC.union, seq(
      $._type, '|', $._type
    )),

    intersection_type: $ => prec.left(PREC.intersection, seq(
      $._type, '&', $._type
    )),

    function_type: $ => seq(
      optional($.type_parameters),
      $.formal_parameters,
      '=>',
      $._type
    )
  }
});

function commaSep1 (rule) {
  return sepBy1(',', rule);
}

function commaSep (rule) {
  return optional(commaSep1(rule));
}

function sepBy1 (sep, rule) {
  return seq(rule, repeat(seq(sep, rule)));
}

function sepBy (sep, rule) {
  return optional(sepBy1(sep, rule));
}

function pattern ($) {
  return choice($.identifier, $.destructuring_pattern)
}

function terminator () {
  return choice(';', sym('_line_break'));
}

function variableType() {
  return choice('var','let','const')
}

function propertyName($) {
  return seq(optional($.accessibility_modifier), optional('static'), optional($.readonly), $.identifier)
}

