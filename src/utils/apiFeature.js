class APIFeatures {
  constructor(model, query, queryString) {
    this.model = model;
    this.query = query;
    this.queryString = queryString;
    this.filterQuery = {};
    this.page = 1;
    this.limit = 10;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ["page", "sort", "limit", "fields", "search"];
    excludedFields.forEach((field) => delete queryObj[field]);

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt|ne|in|nin)\b/g, (match) => `$${match}`);

    this.filterQuery = JSON.parse(queryStr);    
    this.query = this.query.find(this.filterQuery);
    return this;
  }

  search(fields = []) {
    if (!fields.length || !this.queryString.search) return this;

    const regex = new RegExp(this.queryString.search, "i");
    const searchQuery = { $or: fields.map((field) => ({ [field]: regex })) };

    this.filterQuery =
      Object.keys(this.filterQuery).length
        ? { $and: [this.filterQuery, searchQuery] }
        : searchQuery;

    this.query = this.query.find(this.filterQuery);
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(",").join(" ");
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort("-createdAt");
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    }
    return this;
  }

  paginate() {
    const page = parseInt(this.queryString.page, 10) || 1;
    const limit = parseInt(this.queryString.limit, 10) || 10;
    const skip = (page - 1) * limit;

    this.page = page;
    this.limit = limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }

  async countDocuments() {
    return this.model.countDocuments(this.filterQuery);
  }
}

export default APIFeatures;
