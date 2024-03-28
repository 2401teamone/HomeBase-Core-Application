import generateUuid from "../utils/generate_uuid.js";

class TextOptions {
  constructor({ minLength = 0, maxLength = 255 }) {
    this.minLength = minLength;
    this.maxLength = maxLength;
  }

  validate(value) {
    if (typeof value !== "string") return [false, "Value must be a string."];
    if (value.length < this.minLength) return [false, "Value is too short."];
    if (value.length > this.maxLength) return [false, "Value is too long."];
    return [true, ""];
  }
}

class NumberOptions {
  constructor({ min = 0, max = 30 }) {
    this.min = min;
    this.max = max;
  }

  validate(value) {
    if (typeof value !== "number") return [false, "Value must be a number."];
    if (value < this.min) return [false, "Value is too small."];
    if (value > this.max) return [false, "Value is too large."];
    return [true, ""];
  }
}

class BoolOptions {
  constructor({}) {}

  validate(value) {
    if (value !== 0 && value !== 1 && typeof value !== "boolean") {
      return [false, "Value must be a boolean."];
    }
    return [true, ""];
  }
}

class DateOptions {
  constructor({ earliest, latest }) {
    this.earliest = earliest;
    this.latest = latest;
  }
  validate(value) {
    if (typeof value !== "string") return [false, "Value must be a string."];
    if (new Date(value) === "Invalid Date") {
      return [false, "Value is not a date."];
    }
    return [true, ""];
  }
}

class EmailOptions {
  validate(value) {
    if (typeof value !== "string") return [false, "Value must be a string."];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      return [false, "Invalid email address."];
    return [true, ""];
  }
}

class UrlOptions {
  validate(value) {
    if (typeof value !== "string") return [false, "Value must be a string."];
    if (!/^(http|https)?:\/\/[^ "]+$/.test(value))
      return [false, "Invalid URL."];
    return [true, ""];
  }
}

class SelectOptions {
  constructor({ maxSelect = 1, options = [] }) {
    this.maxSelect = maxSelect;
    this.options = options;
  }

  validate(value) {
    if (!Array.isArray(value)) return [false, "Value must be an array."];
    for (let el of value) {
      if (!this.options.includes(el)) return [false, "Invalid select option."];
    }
    if (this.maxSelect !== undefined && value.length > this.maxSelect)
      return [false, "Too many options selected."];
    return [true, ""];
  }
}

class RelationOptions {
  constructor({ tableId, tableName, cascadeDelete = true }) {
    this.tableId = tableId;
    this.tableName = tableName;
    this.cascadeDelete = cascadeDelete;
  }

  validate(value) {
    if (typeof value !== "string" && value !== null)
      return [false, "Invalid input."];
    return [true, ""];
  }
}

class JsonOptions {
  constructor({ maxSize = 2000000 }) {
    this.maxSize = maxSize;
  }

  validate(value) {
    const size = new TextEncoder().encode(value).length;

    if (size > this.maxSize) return [false, "JSON Value is too large."];
    try {
      JSON.parse(JSON.stringify(value));
      return [true, ""];
    } catch (err) {
      return [false, "Value is not a valid JSON."];
    }
  }
}

class CreatorOptions {
  constructor({}) {}

  validate(value) {
    return [true, ""];
  }
}

class PasswordOptions {
  constructor({ requiredPattern = "(?=.*d)(?=.*[!@#$%^&*])", minLength = 10 }) {
    this.requiredPattern = requiredPattern;
    this.minLength = minLength;
  }

  validate(value) {
    if (typeof value !== "string") return [false, "Value must be a string."];
    if (value.length < this.minLength) return [false, "Password is too short."];

    if (!new RegExp(this.requiredPattern).test(value))
      return [false, `Password must match: ${this.requiredPattern}`];
    return [true, ""];
  }
}

class UsernameOptions {
  constructor({ minLength = 4 }) {
    this.minLength = minLength;
  }

  validate(value) {
    if (typeof value !== "string") return [false, "Value must be a string."];
    if (value.length < this.minLength) return [false, "Username is too short."];
    return [true, ""];
  }
}

class Column {
  static COLUMN_MAP = {
    text: {
      sql: "TEXT DEFAULT '' NOT NULL",
      options: TextOptions,
      isJson: false,
    },
    number: {
      sql: "NUMERIC DEFAULT 0 NOT NULL",
      options: NumberOptions,
      isJson: false,
    },
    bool: {
      sql: "BOOLEAN DEFAULT false NOT NULL",
      options: BoolOptions,
      isJson: false,
    },
    date: {
      sql: "TEXT DEFAULT '' NOT NULL",
      options: DateOptions,
      isJson: false,
    },
    email: {
      sql: "TEXT DEFAULT '' NOT NULL",
      options: EmailOptions,
      isJson: false,
    },
    url: {
      sql: "TEXT DEFAULT '' NOT NULL",
      options: UrlOptions,
      isJson: false,
    },
    select: {
      sql: "JSON DEFAULT [] NOT NULL",
      options: SelectOptions,
      isJson: true,
    },
    relation: {
      options: RelationOptions,
      isJson: false,
    },
    json: {
      sql: "JSON DEFAULT NULL",
      options: JsonOptions,
      isJson: true,
    },
    creator: {
      sql: "TEXT DEFAULT '' NOT NULL",
      options: CreatorOptions,
      isJson: false,
    },
    password: {
      sql: "TEXT DEFAULT '' NOT NULL",
      options: PasswordOptions,
      isJson: false,
    },
    username: {
      sql: "TEXT DEFAULT '' NOT NULL",
      options: UsernameOptions,
      isJson: false,
    },
  };

  static isValidType(type) {
    return Object.keys(Column.COLUMN_MAP).includes(type);
  }

  constructor({
    id = generateUuid(),
    system = 0,
    name,
    type,
    required = 0,
    unique = 0,
    show = 1,
    options = {},
  }) {
    this.id = id;
    this.system = system;
    this.name = name;
    this.type = type;
    this.required = required;
    this.unique = unique;
    this.show = show;
    this.options = new Column.COLUMN_MAP[type].options(options);
  }

  generateId() {
    this.id = generateUuid();
  }

  getOptions() {
    return this.options;
  }
}

export default Column;
