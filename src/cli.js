import { createReadStream, createWriteStream, renameSync } from 'fs';
import { convert } from './index';

/**
 * Run the script with the user-supplied arguments.
 *
 * @param {string[]} args
 */
export default function run(args) {
  const input = parseArguments(args);

  if (input.paths.length) {
    runWithPaths(input.paths, input.options);
  } else {
    runWithStream(process.stdin, process.stdout, input.options);
  }
}

/**
 * @param {string[]} args
 * @returns {{options: ConvertOptions, paths: string[]}}
 */
function parseArguments(args) {
  const options = /** @type ConvertOptions */{};
  const paths = /** @type string[] */[];

  for (var i = 0; i < args.length; i++) {
    var arg = args[i];
    switch (arg) {
      case '--commas':
      case '--no-commas':
        options.commas = (arg === '--commas');
        break;

      case '--call-parens':
      case '--no-call-parens':
        options.callParens = (arg === '--call-parens');
        break;

      case '--function-parens':
      case '--no-function-parens':
        options.functionParens = (arg === '--function-parens');
        break;

      case '--this':
      case '--no-this':
        options.this = (arg === '--this');
        break;

      case '--prototype-access':
      case '--no-prototype-access':
        options.prototypeAccess = (arg === '--prototype-access');
        break;

      case '--declarations':
      case '--no-declarations':
        options.declarations = (arg === '--declarations');
        break;

      default:
        paths.push(arg);
        break;
    }
  }

  return { options: options, paths: paths };
}

/**
 * Run decaffeinate on the given paths, changing them in place.
 *
 * @param {string[]} paths
 * @param {ConvertOptions=} options
 * @param {?function(Error[])=} callback
 */
function runWithPaths(paths, options, callback) {
  const errors = [];
  var index = 0;

  function processPath(path) {
    const temporaryPath = path + '.decaffeinate';
    runWithStream(
      createReadStream(path, 'utf8'),
      createWriteStream(temporaryPath, 'utf8'),
      options,
      function(err) {
        if (err) {
          errors.push(err);
        } else {
          renameSync(temporaryPath, path);
        }
        processNext();
      }
    );
  }

  function processNext() {
    if (index < paths.length) {
      processPath(paths[index++]);
    } else if (callback) {
      callback(errors);
    }
  }

  processNext();
}

/**
 * Run decaffeinate reading from input and writing to corresponding output.
 *
 * @param {ReadableStream} input
 * @param {WritableStream} output
 * @param {ConvertOptions=} options
 * @param {function(?Error)=} callback
 */
function runWithStream(input, output, options, callback) {
  var error;
  var data = '';

  input.setEncoding('utf8');

  input.on('data', function(chunk) {
    data += chunk;
  });

  input.on('end', function() {
    output.end(convert(data, options), function() {
      if (callback) {
        callback(error);
      }
    });
  });

  output.on('error', function(err) {
    error = err;
  });
}
