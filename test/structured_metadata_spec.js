const expect = require("expect.js");
const cloudinary = require("../cloudinary");
const helper = require("./spechelper");

const SUFFIX = helper.SUFFIX;
const EXTERNAL_ID_PREFIX = "metadata";
const EXTERNAL_ID = EXTERNAL_ID_PREFIX + SUFFIX;
const EXTERNAL_ID_1 = EXTERNAL_ID + "_1";
const EXTERNAL_ID_2 = EXTERNAL_ID + "_2";
const EXTERNAL_ID_3 = EXTERNAL_ID + "_3";

const api = cloudinary.v2.api;

describe("structured metadata api", function () {
  const metadata_field_external_ids = [];
  const metadata_arr = [
    {
      external_id: EXTERNAL_ID_1,
      label: "color",
      type: "string",
      default_value: "blue",
    }, {
      external_id: EXTERNAL_ID_2,
      label: "colors",
      type: "set",
      datasource: {
        values: [
          { external_id: "color_1", value: "red" },
          { external_id: "color_2", value: "blue" },
        ],
      },
    },
  ];
  const mandatory_fields = ['type', 'external_id', 'label', 'mandatory', 'default_value', 'validation'];
  after(function () {
    metadata_field_external_ids.forEach(external_id => api.delete_metadata_field(external_id));
  });

  it("should create metadata", () => {
    const labels = metadata_arr.map(item => item.label);
    return Promise.all(metadata_arr.map(field => api.create_metadata_field(field))).then((results) => {
      expect(results).not.to.be.empty();
      results.forEach((res) => {
        expect(res).not.to.be.empty();
        expect(labels).to.contain(res.label);
        metadata_field_external_ids.push(res.external_id);
      });
    });
  });
  describe("date_field_validation", function () {
    let metadata;
    const maxValidDate = '2000-01-01';
    const minValidDate = '1950-01-01';
    const validDate = '1980-04-20';
    const invalidDate = '1940-01-20';

    beforeEach(function () {
      metadata = {
        external_id: EXTERNAL_ID_3,
        label: "dateOfBirth",
        type: "date",
        mandatory: true,
        validation: {
          type: "and",
          rules: [
            {
              type: "greater_than",
              value: minValidDate,
            }, {
              type: "less_than",
              value: maxValidDate,
            },
          ],
        },
      };
    });
    it("should create date field with default value", () => {
      metadata.default_value = validDate;
      return api.create_metadata_field(metadata).then((result) => {
        expect(result).not.to.be.empty();
        expect(result.label).to.eql(metadata.label);
        metadata_field_external_ids.push(result.external_id);
      });
    });
    it("should not create date field with illegal default value", () => {
      metadata.default_value = invalidDate;
      return api.create_metadata_field(metadata).then(() => {
        expect().fail();
      }).catch((res) => {
        expect(res.error).not.to.be(void 0);
        expect(res.error.message).to.contain("default_value is invalid");
      });
    });
  });
  it("should return list metadata field definitions", function () {
    return api.list_metadata_fields().then((result) => {
      expect(result).not.to.be.empty();
      expect(result.metadata_fields).not.to.be.empty();
      result.metadata_fields.forEach((field) => {
        expect(field).to.include.keys(...mandatory_fields);
      });
    });
  });
  it("should return metadata field by external id", function () {
    return api.get_metadata_field(metadata_arr[0].external_id).then((result) => {
      expect(result).not.to.be.empty();
      expect(result).to.include.keys(...mandatory_fields);
      expect(result.label).to.eql(metadata_arr[0].label);
    });
  });
  it("should update metadata field by external id", function () {
    const metadata = {
      default_value: "red",
    };
    return api.update_metadata_field(metadata_arr[0].external_id, metadata).then((result) => {
      expect(result).not.to.be.empty();
      expect(result).to.include.keys(...mandatory_fields);
      expect(result.label).to.eql(metadata_arr[0].label);
      expect(result.default_value).to.eql(metadata.default_value);
    });
  });
  it("should delete metadata field by external id", function () {
    return api.delete_metadata_field(metadata_arr[0].external_id).then((result) => {
      expect(result).not.to.be.empty();
      expect(result.message).to.eql("ok");
    });
  });
  it("should update metadata field datasource by external id", function () {
    const datasource = {
      values: [
        { external_id: "color_1", value: "brown" },
        { external_id: "color_2", value: "black" },
      ],
    };
    return api.update_metadata_field_datasource(metadata_arr[1].external_id, datasource).then((result) => {
      expect(result).not.to.be.empty();
      expect(result.values).not.to.be.empty();
      result.values.forEach((item) => {
        let before_update_value = datasource.values.find(val => val.external_id === item.external_id);
        expect(item.value).to.eql(before_update_value.value);
      });
    });
  });
  it("should delete entries in metadata field datasource", function () {
    const external_ids = [metadata_arr[1].datasource.values[0].external_id];
    return api.delete_entries_field_datasource(metadata_arr[1].external_id, { external_ids }).then((result) => {
      expect(result).not.to.be.empty();
    });
  });
  it.skip("should upload image with metadata option", function () {
    cloudinary.v2.config(true);
    return cloudinary.v2.uploader.upload("https://res.cloudinary.com/rtlstudio/image/upload/v1570730435/67870254_2481490465263818_8372213315262218240_n_nzajfq.jpg", {
      tags: 'metadata_sample',
      metadata: `${metadata_arr[0].external_id}=123456`,
    }).then(function (result) {
      expect(result).not.to.be.empty();
      expect(result.fieldId).to.eql("123456");
    });
  });
});