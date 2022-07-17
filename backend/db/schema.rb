# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema.define(version: 2022_06_26_145315) do

  create_table "metadata", force: :cascade do |t|
    t.string "transaction_id"
  end

  create_table "squares", force: :cascade do |t|
    t.string "idx", default: "", null: false
    t.string "img"
    t.string "msg"
    t.string "url"
    t.integer "x"
    t.integer "y"
    t.string "traits"
    t.string "the_type"
    t.string "audio"
    t.string "tdrs"
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.index ["idx"], name: "index_squares_on_idx", unique: true
  end

end
