import { BinaryReader } from 'harmony-binary-reader';

import protobufjs from 'protobufjs'
import { readFile } from 'fs/promises';
import { writeFile } from 'fs/promises';

const _protoElements = {};
const typeLookup = [
	null,
	null,
	null,
	null,
	null,
	null,
	'CMsgVariableDefinition',
	'CMsgPaintKit_Operation',
	'CMsgPaintKit_ItemDefinition',
	'CMsgPaintKit_Definition',
	'CMsgHeaderOnly',
]

if (process.argv.length != 5) {
	process.exit(1);
}

const proto_defs_path = process.argv[2];
const tf_proto_def_messages_path = process.argv[3];
const output_file = process.argv[4];

initProtoDefs();


function initProtoDefs() {
	const root = new protobufjs.Root();
	root.load(tf_proto_def_messages_path,
		//{ keepCase: true },
		async (err, root) => {
			if (err) {
				throw err;
			}
			await readProtoDefs(root);
			await writeFile(output_file, JSON.stringify(_protoElements, undefined, ''));
		}
	);
}


async function readProtoDefs(root) {
	let protoDefsFile = await readFile(proto_defs_path);

	let reader = new BinaryReader(protoDefsFile, undefined, undefined, true);

	let nextOffset = 0;
	while (true) {
		if (nextOffset >= reader.byteLength) {
			break;
		}
		reader.seek(nextOffset);
		let elementType = reader.getInt32();
		let elementCount = reader.getInt32();

		_protoElements[elementType] = {};

		nextOffset = reader.tell();

		let type = root.lookupType(typeLookup[elementType] ?? '');

		for (let i = 0; i < elementCount; i++) {
			reader.seek(nextOffset);
			let elementSize = reader.getInt32();
			let elementOffset = reader.tell();
			nextOffset = elementOffset + elementSize;

			if (type && type.decode) {
				var bufferSliceWhereProtobufBytesIs = reader.getBytes(elementSize);
				var msg = type.decode(bufferSliceWhereProtobufBytesIs);
				_protoElements[elementType][msg.header.defindex] = msg;
			}
		}
	}
}
