args = Hash[ ARGV.join(' ').scan(/--?([^=\s]+)(?:=(\S+))?/) ]
UPDATING = (args['updating'] == "true" || false)
INIT = (args['init'] == "true" || false)
POLICY_ID = "e3ac0dd93edbe6bafec38fb120cf7c3e223686a97261008c2bfe0d6d"
BLOCKFROST_SUBDOMAIN = "cardano-mainnet"

require './src/models'
require './src/creator'
require 'curb'

puts "loading app.rb"

class App

  puts "launching the cardanospace app v1"

  def self.metadata_txs
    http = Curl.get("https://#{ENV['BLOCKFROST_SUBDOMAIN']}.blockfrost.io/api/v0/metadata/txs/labels/909?order=desc&count=5") do |http|
      http.headers['project_id'] = ENV['BLOCKFROST_API']
    end
    return JSON.parse(http.body)
  end

  def self.transaction_utxos(transaction_id)
    http = Curl.get("https://#{ENV['BLOCKFROST_SUBDOMAIN']}.blockfrost.io/api/v0/txs/#{transaction_id}/utxos") do |http|
      http.headers['project_id'] = ENV['BLOCKFROST_API']
    end
    return JSON.parse(http.body)
  end

  def self.detect_new_metadata_transactions
    last_transactions = metadata_txs
    last_transactions.keep_if { |tx| Metadata.where(transaction_id: tx["tx_hash"]).empty? }
    last_transactions.each do |transaction|
      puts "processing new upload with tx id: " + transaction["tx_hash"]
      begin
        new_img = process_sent_metadata(transaction)
        if new_img then
          Metadata.create(transaction_id: transaction["tx_hash"])
        else
          Metadata.create(transaction_id: transaction["tx_hash"])
        end
      rescue
        puts "something went wrong processing sent metadata"
      end
    end
  end

  def self.process_sent_metadata(transaction)
    begin
      if transaction && transaction["json_metadata"].any? then
        puts "starting to process blocklink metadata for #{transaction["tx_hash"]}"
        squares = transaction["json_metadata"]["CardanoSpaces"].length > 1 ? transaction["json_metadata"]["CardanoSpaces"] : transaction["json_metadata"]["CardanoSpaces"][0].split(",")
        square_keys = squares.map { |sk| sk.tr('-', '').gsub('100', '00').gsub(/\d{0}0[0][0]/, "").upcase }
        utxos = transaction_utxos(transaction["tx_hash"])
        asset_names = utxos["outputs"][0]["amount"].pluck("unit")
        if asset_names.length > 1 then
          asset_names.delete("lovelace")
          asset_names = asset_names.map { |an| an.split(POLICY_ID)[1] }
          tx_keys = asset_names.map { |an| [an].pack('H*').split("CardanoSpace")[1] }
          left_over_keys = square_keys - tx_keys
          transaction["json_metadata"]["CardanoSpaces"] = square_keys - left_over_keys
          transaction["json_metadata"]["CardanoSpaces"] = transaction["json_metadata"]["CardanoSpaces"].map { |sk| sk.gsub(/\d{0}0[0][0]/, "").upcase }
          new_img = process_block_metadata(transaction)
          return new_img
        elsif asset_names.length <= 2 then
          puts "couldn't find any assets for #{transaction["tx_hash"]} - did this person not attach nfts? Marking as processed."
        end
      end
    rescue
      puts "something failed processing the new metadata for #{transaction["tx_hash"]}"
    end
  end

  def self.process_block_metadata(transaction)
    begin
      img_changed = false
      transaction["json_metadata"]["CardanoSpaces"].each do |idxn|
        idxn = idxn.tr('-', '').gsub("100", "00").upcase
        idx = idxn.length > 4 ? idxn.split(/(?=(\d{3}|\d{1}))/)[0..1].join('-') : idxn.split(/(?=(\d{2}|\d{1}))/)[0..1].join('-')
        square = Square.find_by_idx(idx)
        puts ("updating square #{idx}")
        img_url = transaction["json_metadata"]["img"].include?("ipfs://") ? transaction["json_metadata"]["img"] : ("ipfs://" + transaction["json_metadata"]["img"])
        square.img   = img_url.gsub(" ", "") || square.img
        square.url   = transaction["json_metadata"]["url"] || square.url
        square.msg   = transaction["json_metadata"]["msg"] || square.msg
        if transaction["json_metadata"].keys.include?("audio") then
          audio_url = transaction["json_metadata"]["audio"].include?("ipfs://") ? transaction["json_metadata"]["audio"] : ("ipfs://" + transaction["json_metadata"]["audio"])
          square.audio = audio_url.gsub(" ", "") || square.audio
        end
        if transaction["json_metadata"].keys.include?("tdrs") then
          tdrs_idxn = transaction["json_metadata"]["tdrs"].gsub("-", "")
          tdrs_idx = tdrs_idxn.length > 4 ? tdrs_idxn.split(/(?=(\d{3}|\d{1}))/)[0..1].join('-') : tdrs_idxn.split(/(?=(\d{2}|\d{1}))/)[0..1].join('-')
          square.tdrs = tdrs_idx || square.tdrs
        end
        img_changed = square.img_changed?
        square.save
      end
      return img_changed
    rescue
      puts "something went wrong processing block metadata"
    end
  end
end

if INIT then
  puts "we're creating the cardanospace tiles and uploading them to AWS"
  Creator.download_ipfses_since(60.minutes.ago)
  Creator.generate
  puts "done generating the files, now going into the normal shell"
end

puts "going to check for updating"
while UPDATING do
  puts "we're checking for updates"
  begin
    App.detect_new_metadata_transactions
    puts "updates processed, going to sleep"
    sleep(30)
  rescue
    puts "something failed in the async metadata loop"
    sleep(30)
  end
end
puts "updating flag not set!"